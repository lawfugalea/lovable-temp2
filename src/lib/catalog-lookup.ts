import { prisma } from './prisma'
import { normalizeCatalogText } from './catalog-normalization'
import { catalogSearchTokens, rankCatalogCandidates, tokenVariants } from './catalog-search'

const MAX_CANDIDATES = 2_000

// normalizedName is space-normalized, so "starts with" plus "contains ' token'"
// is an exact word-boundary match — substrings inside words never qualify.
function wordBoundaryClauses(values: string[]) {
  return {
    OR: values.flatMap(value => [
      { normalizedName: { startsWith: value, mode: 'insensitive' as const } },
      { normalizedName: { contains: ` ${value}`, mode: 'insensitive' as const } },
      { brand: { startsWith: value, mode: 'insensitive' as const } },
      { brand: { contains: ` ${value}`, mode: 'insensitive' as const } },
    ]),
  }
}

export function fetchCatalogCandidates(tokenValueSets: string[][], storeSlugs?: string[]) {
  return prisma.canonicalProduct.findMany({
    where: {
      products: {
        some: {
          active: true,
          store: { enabled: true, ...(storeSlugs ? { slug: { in: storeSlugs } } : {}) },
        },
      },
      AND: tokenValueSets.map(wordBoundaryClauses),
    },
    select: {
      id: true,
      displayName: true,
      brand: true,
      normalizedName: true,
    },
    take: MAX_CANDIDATES,
  })
}

/** Recall with plural variants, then a typo-prefix fallback for long tokens. */
export async function searchCatalogCandidates(tokens: string[], storeSlugs?: string[]) {
  let candidates = await fetchCatalogCandidates(tokens.map(tokenVariants), storeSlugs)
  if (!candidates.length && tokens.some(token => token.length >= 5)) {
    candidates = await fetchCatalogCandidates(
      tokens.map(token => (token.length >= 5 ? [token.slice(0, 3)] : tokenVariants(token))),
      storeSlugs,
    )
  }
  return candidates
}

/**
 * Best catalogue match for a free-text title, or null when nothing plausible
 * exists — callers fall back to an unlinked, title-only record.
 */
export async function findBestCanonicalProduct(title: string): Promise<{ id: string; displayName: string } | null> {
  const query = normalizeCatalogText(title)
  if (query.length < 2) return null
  const tokens = catalogSearchTokens(query)
  if (!tokens.length) return null
  const candidates = await searchCatalogCandidates(tokens)
  const ranked = rankCatalogCandidates(candidates, query)
  const best = ranked[0]
  return best ? { id: best.id, displayName: best.displayName } : null
}
