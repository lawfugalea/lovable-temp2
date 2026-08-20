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

/** Singular/plural folding: "bananas" -> "banana", "tomatoes" -> "tomato". */
export function foldPlural(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length > 3 && word.endsWith('oes')) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** All spellings of a token worth matching at a word boundary. */
export function tokenVariants(token: string): string[] {
  const folded = foldPlural(token)
  return Array.from(new Set([token, folded, `${folded}s`, `${folded}es`]))
}

/** True when two words are within one edit (insert/delete/substitute/transpose). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  const lenDiff = a.length - b.length
  if (Math.abs(lenDiff) > 1) return false
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  let i = 0
  while (i < short.length && short[i] === long[i]) i++
  if (lenDiff !== 0) {
    // one insertion/deletion: remainder must align after skipping one char in the longer word
    return short.slice(i) === long.slice(i + 1)
  }
  // same length: allow one substitution or one adjacent transposition
  if (short.slice(i + 1) === long.slice(i + 1)) return true
  return (
    short[i] === long[i + 1] &&
    short[i + 1] === long[i] &&
    short.slice(i + 2) === long.slice(i + 2)
  )
}

const PACKAGING_WORDS = new Set(['pack', 'packs', 'pcs', 'pc', 'pieces', 'piece', 'ct', 'multipack'])

/** Package sizes and counts ("1l", "500g", "x6") are not meaningful name words. */
function isPackagingWord(word: string): boolean {
  return /^\d/.test(word) || /^x\d/.test(word) || PACKAGING_WORDS.has(word)
}

const MATCH_NONE = 0
const MATCH_FUZZY = 1
const MATCH_PREFIX = 2
const MATCH_EXACT = 3

function matchTokenAgainstWord(token: string, word: string): number {
  if (word === token) return MATCH_EXACT
  if (foldPlural(word) === foldPlural(token)) return MATCH_EXACT
  if (token.length >= 3 && word.startsWith(token)) return MATCH_PREFIX
  if (token.length >= 5 && withinOneEdit(foldPlural(token), foldPlural(word))) return MATCH_FUZZY
  return MATCH_NONE
}

interface CandidateEvaluation {
  score: number
  /** True when at least one token only matched through typo tolerance. */
  fuzzy: boolean
}

export function evaluateCatalogCandidate(
  candidate: CatalogSearchCandidate,
  normalizedQuery: string,
): CandidateEvaluation {
  const name = normalizeCatalogText(candidate.normalizedName || candidate.displayName)
  const brand = normalizeCatalogText(candidate.brand || '')
  const nameWords = name.split(' ').filter(Boolean)
  const brandWords = brand.split(' ').filter(Boolean)
  const tokens = catalogSearchTokens(normalizedQuery)
  if (!tokens.length || !nameWords.length) return { score: -1, fuzzy: false }

  let score = 0
  let fuzzy = false
  let allExactInName = true
  let headNounIndex = -1
  for (let index = nameWords.length - 1; index >= 0; index--) {
    if (!isPackagingWord(nameWords[index])) {
      headNounIndex = index
      break
    }
  }

  for (const token of tokens) {
    let best = MATCH_NONE
    let bestIndex = -1
    nameWords.forEach((word, index) => {
      const quality = matchTokenAgainstWord(token, word)
      if (quality > best) {
        best = quality
        bestIndex = index
      }
    })
    let inBrand = false
    if (best < MATCH_EXACT) {
      for (const word of brandWords) {
        const quality = matchTokenAgainstWord(token, word)
        if (quality > best) {
          best = quality
          inBrand = true
        }
      }
    }
    // Every token must land on a word boundary somewhere — substrings inside
    // words ("tea" in "chateau") are never a match.
    if (best === MATCH_NONE) return { score: -1, fuzzy: false }
    if (best === MATCH_FUZZY) fuzzy = true
    if (best < MATCH_EXACT || inBrand) allExactInName = false

    score += best * 400
    if (!inBrand && bestIndex >= 0) {
      // Earlier words matter more, and product names usually end in the head
      // noun ("fresh milk" vs "milk chocolate") — reward matching it.
      score += Math.max(0, 200 - bestIndex * 40)
      if (bestIndex === headNounIndex && best === MATCH_EXACT) score += 1_200
    }
  }

  // Phrase bonuses compare plural-folded forms so "bananas" still treats
  // "Banana 1kg" as the product itself rather than a partial match.
  const foldedQuery = tokens.map(foldPlural).join(' ')
  const foldedName = nameWords.map(foldPlural).join(' ')
  const foldedMeaningName = nameWords
    .filter(word => !isPackagingWord(word))
    .map(foldPlural)
    .join(' ')

  if (name === normalizedQuery || foldedMeaningName === foldedQuery) score += 10_000
  else if (`${brand} ${name}`.trim() === normalizedQuery) score += 9_000
  else if (foldedName.startsWith(`${foldedQuery} `)) score += 1_500
  else if (foldedName.includes(` ${foldedQuery} `) || foldedName.endsWith(` ${foldedQuery}`)) score += 1_000

  if (allExactInName) score += 800

  // For equally relevant matches, concise product names are usually more useful.
  return { score: score - Math.min(name.length, 200), fuzzy }
}

export function scoreCatalogCandidate(candidate: CatalogSearchCandidate, normalizedQuery: string): number {
  return evaluateCatalogCandidate(candidate, normalizedQuery).score
}

const MIN_STRONG_MATCHES_TO_DROP_FUZZY = 3

export function rankCatalogCandidates<T extends CatalogSearchCandidate>(candidates: T[], query: string): T[] {
  const normalizedQuery = normalizeCatalogText(query)
  const evaluated = candidates
    .map(candidate => ({ candidate, ...evaluateCatalogCandidate(candidate, normalizedQuery) }))
    .filter(entry => entry.score >= 0)

  // Typo-tolerant matches are a fallback: hide them when enough confident
  // matches exist so results stay realistic.
  const strong = evaluated.filter(entry => !entry.fuzzy)
  const pool = strong.length >= MIN_STRONG_MATCHES_TO_DROP_FUZZY ? strong : evaluated

  return pool
    .sort((a, b) => b.score - a.score || a.candidate.displayName.localeCompare(b.candidate.displayName))
    .map(entry => entry.candidate)
}
