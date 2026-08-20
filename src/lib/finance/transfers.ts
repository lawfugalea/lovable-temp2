/**
 * Pair up the two legs of a transfer between the household's own accounts.
 *
 * Why this exists: money moved from one of your accounts to another is not
 * income on one side and spending on the other, but the statistics pipeline
 * classified purely by sign and so counted it as both. On the real data that made
 * "24x7 Transfer Between Own Accounts" the largest merchant in the household at
 * €12,147 and inflated the savings rate with money that never arrived from
 * anywhere.
 *
 * Matching both legs is what makes the exclusion safe: it proves the money landed
 * in another account we can see, rather than guessing from a category name.
 */
import type { TransferKind } from './enrichment'
import { type Cents } from './money'

const DEFAULT_MAX_DAY_GAP = 3
const MIN_HINT_DIGITS = 6
const DAY_MS = 24 * 60 * 60 * 1000

export type TransferCandidate = {
  id: string
  accountId: string
  currency: string
  /** Signed: negative leaves the account, positive arrives. */
  amountCents: Cents
  bookingDate: Date
  transferKind: TransferKind
  hasUserMemo: boolean
  counterpartyAccountHint: string | null
}

export type TransferPairConfidence = 'ACCOUNT_HINT' | 'AMOUNT_DATE'

export type TransferPair = {
  outgoingId: string
  incomingId: string
  outgoingAccountId: string
  incomingAccountId: string
  /** Absolute amount, counted once for the pair rather than once per leg. */
  amountCents: Cents
  currency: string
  date: string
  dayGap: number
  confidence: TransferPairConfidence
}

export type UnmatchedTransfer = {
  id: string
  direction: 'IN' | 'OUT'
  amountCents: Cents
  hasUserMemo: boolean
  counterpartyAccountHint: string | null
}

export type TransferMatchResult = {
  pairs: TransferPair[]
  pairedIds: Set<string>
  unmatched: UnmatchedTransfer[]
  /** Currencies where an eligible leg exists but pairing cannot apply. */
  crossCurrencyCurrencies: string[]
}

export type TransferMatchOptions = {
  /** accountId → identifiers for that account (IBAN digits, account numbers). */
  accountIdentifiers?: Map<string, Set<string>>
  maxDayGap?: number
}

/** A leg that could conceivably be one half of an internal transfer. */
function isEligible(candidate: TransferCandidate): boolean {
  return candidate.transferKind !== 'NONE' && candidate.amountCents !== 0
}

function dayOf(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS)
}

function hintMatches(hint: string | null, identifiers: Set<string> | undefined): boolean {
  if (!hint || !identifiers || hint.length < MIN_HINT_DIGITS) return false
  for (const identifier of identifiers) {
    if (identifier.length < MIN_HINT_DIGITS) continue
    if (identifier.endsWith(hint) || hint.endsWith(identifier)) return true
  }
  return false
}

/**
 * Match outgoing legs to incoming legs, one to one.
 *
 * Amounts must be equal to the cent: legs of the same transfer inside one bank
 * are exact, and a tolerance would only manufacture false pairs among the many
 * repeated round amounts in a real account. Currencies are never compared, so a
 * cross-currency move between own accounts stays unmatched and is reported
 * instead of being silently dropped.
 */
export function matchInternalTransfers(
  candidates: readonly TransferCandidate[],
  options: TransferMatchOptions = {},
): TransferMatchResult {
  const maxDayGap = options.maxDayGap ?? DEFAULT_MAX_DAY_GAP
  const identifiers = options.accountIdentifiers ?? new Map<string, Set<string>>()
  const eligible = candidates.filter(isEligible)

  const byCurrency = new Map<string, TransferCandidate[]>()
  for (const candidate of eligible) {
    const currency = candidate.currency.toUpperCase()
    const bucket = byCurrency.get(currency)
    if (bucket) bucket.push(candidate)
    else byCurrency.set(currency, [candidate])
  }

  type Edge = { out: TransferCandidate; in: TransferCandidate; score: number; dayGap: number }
  const pairs: TransferPair[] = []
  const pairedIds = new Set<string>()

  for (const [currency, group] of byCurrency) {
    const byAmount = new Map<number, TransferCandidate[]>()
    for (const candidate of group) {
      const amount = Math.abs(candidate.amountCents)
      const bucket = byAmount.get(amount)
      if (bucket) bucket.push(candidate)
      else byAmount.set(amount, [candidate])
    }

    const edges: Edge[] = []
    for (const bucket of byAmount.values()) {
      const outgoing = bucket.filter(candidate => candidate.amountCents < 0)
      const incoming = bucket.filter(candidate => candidate.amountCents > 0)
      for (const out of outgoing) {
        for (const into of incoming) {
          if (out.accountId === into.accountId) continue
          const gap = dayOf(into.bookingDate) - dayOf(out.bookingDate)
          // Money cannot land materially before it leaves; one day absorbs the
          // booking-date skew banks introduce either side of midnight.
          if (gap < -1 || gap > maxDayGap) continue
          const hinted = hintMatches(out.counterpartyAccountHint, identifiers.get(into.accountId))
            || hintMatches(into.counterpartyAccountHint, identifiers.get(out.accountId))
          const bothOwn = out.transferKind === 'OWN_ACCOUNT' && into.transferKind === 'OWN_ACCOUNT'
          edges.push({
            out,
            in: into,
            dayGap: Math.abs(gap),
            score: (hinted ? 100 : 0) + (bothOwn ? 10 : 0) - Math.abs(gap),
          })
        }
      }
    }

    // A total order, so the result never depends on input order.
    edges.sort((left, right) =>
      right.score - left.score
      || left.dayGap - right.dayGap
      || left.out.bookingDate.getTime() - right.out.bookingDate.getTime()
      || left.out.id.localeCompare(right.out.id)
      || left.in.id.localeCompare(right.in.id))

    for (const edge of edges) {
      if (pairedIds.has(edge.out.id) || pairedIds.has(edge.in.id)) continue
      pairedIds.add(edge.out.id)
      pairedIds.add(edge.in.id)
      pairs.push({
        outgoingId: edge.out.id,
        incomingId: edge.in.id,
        outgoingAccountId: edge.out.accountId,
        incomingAccountId: edge.in.accountId,
        amountCents: Math.abs(edge.out.amountCents),
        currency,
        date: edge.out.bookingDate.toISOString().slice(0, 10),
        dayGap: edge.dayGap,
        confidence: edge.score >= 100 ? 'ACCOUNT_HINT' : 'AMOUNT_DATE',
      })
    }
  }

  pairs.sort((left, right) => right.date.localeCompare(left.date) || right.amountCents - left.amountCents)

  const unmatched: UnmatchedTransfer[] = eligible
    .filter(candidate => !pairedIds.has(candidate.id))
    .map(candidate => ({
      id: candidate.id,
      direction: candidate.amountCents > 0 ? 'IN' : 'OUT',
      amountCents: Math.abs(candidate.amountCents),
      hasUserMemo: candidate.hasUserMemo,
      counterpartyAccountHint: candidate.counterpartyAccountHint,
    }))

  return {
    pairs,
    pairedIds,
    unmatched,
    crossCurrencyCurrencies: byCurrency.size > 1 ? [...byCurrency.keys()].sort() : [],
  }
}

/**
 * Collect the identifiers that name each account, used to confirm a pair.
 *
 * The creditor/debtor IBAN on a BOV transaction is the account the row belongs
 * to, not the counterparty, which makes it useless for identifying the other side
 * but exactly right for learning each account's own number. The masked identifier
 * is included for completeness but is only four digits, so it can never satisfy
 * `hintMatches` on its own.
 */
export function buildOwnAccountIdentifiers(
  rows: readonly { accountId: string; ownAccountIdentifiers: readonly string[] }[],
  accounts: readonly { id: string; maskedIdentifier?: string | null }[] = [],
): Map<string, Set<string>> {
  const identifiers = new Map<string, Set<string>>()
  const add = (accountId: string, value: string | null | undefined) => {
    const digits = value?.replace(/\D/g, '')
    if (!digits) return
    const existing = identifiers.get(accountId)
    if (existing) existing.add(digits)
    else identifiers.set(accountId, new Set([digits]))
  }
  for (const row of rows) {
    for (const identifier of row.ownAccountIdentifiers) add(row.accountId, identifier)
  }
  for (const account of accounts) add(account.id, account.maskedIdentifier)
  return identifiers
}
