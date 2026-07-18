import { normalizeCatalogText } from './catalog-normalization'

export interface CatalogSearchCandidate {
  id: string
  displayName: string
  brand: string | null
  normalizedName: string
}

export function catalogSearchTokens(query: string): string[] {
  return Array.from(new Set(
    normalizeCatalogText(query).split(' ').filter(token => token.length > 1),
  )).slice(0, 8)
}

export function scoreCatalogCandidate(candidate: CatalogSearchCandidate, normalizedQuery: string): number {
  const name = normalizeCatalogText(candidate.normalizedName || candidate.displayName)
  const brand = normalizeCatalogText(candidate.brand || '')
  const combined = `${brand} ${name}`.trim()
  const words = new Set(combined.split(' ').filter(Boolean))
  const tokens = catalogSearchTokens(normalizedQuery)

  if (!tokens.length) return 0
  if (!tokens.every(token => words.has(token) || combined.includes(token))) return -1

  let score = 0
  if (name === normalizedQuery) score += 10_000
  else if (combined === normalizedQuery) score += 9_000
  else if (name.startsWith(`${normalizedQuery} `)) score += 6_000
  else if (combined.startsWith(`${normalizedQuery} `)) score += 5_000
  else if (name.includes(normalizedQuery)) score += 4_000
  else if (combined.includes(normalizedQuery)) score += 3_000

  for (const token of tokens) {
    if (words.has(token)) score += 400
    else if (combined.split(' ').some(word => word.startsWith(token))) score += 250
    else score += 100
  }

  // For equally relevant matches, concise product names are usually more useful.
  return score - Math.min(name.length, 200)
}

export function rankCatalogCandidates<T extends CatalogSearchCandidate>(candidates: T[], query: string): T[] {
  const normalizedQuery = normalizeCatalogText(query)
  return candidates
    .map(candidate => ({ candidate, score: scoreCatalogCandidate(candidate, normalizedQuery) }))
    .filter(entry => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.candidate.displayName.localeCompare(b.candidate.displayName))
    .map(entry => entry.candidate)
}
