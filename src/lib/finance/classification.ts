/**
 * Decide what a transaction *is*: money spent, money earned, or money that only
 * moved between accounts.
 *
 * The old pipeline answered this with `signedAmount >= 0`, which is why internal
 * transfers appeared as both income and spending, refunds inflated income instead
 * of reducing spend, and a row with no credit/debit indicator became income.
 * Everything that reads a total now goes through one classifier.
 */
import type { AmountSource, FinanceCategory, TransferKind } from './enrichment'
import type { Cents } from './money'

export type FlowClass =
  /** Money the household consumed. Includes bills and cash withdrawals. */
  | 'SPENDING'
  /** Money that arrived from outside the household's own accounts. */
  | 'INCOME'
  /** A credit that reverses earlier spending. Reduces spend, never raises income. */
  | 'REFUND'
  /** Both legs of an own-account transfer are visible; neither is counted. */
  | 'INTERNAL_MATCHED'
  /** A credit from an own account we cannot see. Not new money. */
  | 'INTERNAL_UNMATCHED_IN'
  /** A debit to an own account we cannot see, with nothing to say it bought anything. */
  | 'INTERNAL_UNMATCHED_OUT'
  /** Zero-value entries: fee waivers, reversals that net out. */
  | 'ZERO'
  /** The bank gave no direction and the amount was unsigned. Counted nowhere. */
  | 'UNKNOWN_SIGN'

/**
 * Categories that are never consumption, whichever way the money went.
 *
 * Deliberately narrower than {@link NON_DISCRETIONARY_CATEGORIES}: bills and cash
 * withdrawals *are* spending, and excluding them from a spending total — as the
 * coach's set does, correctly, for its own purpose — would understate outgoings.
 */
export const NON_SPENDING_CATEGORIES: ReadonlySet<FinanceCategory> = new Set<FinanceCategory>([
  'Income',
  'Refunds',
  'Transfers',
])

/**
 * Categories the coach ignores when looking for discretionary habits: you cannot
 * choose to spend less on your mortgage this week.
 */
export const NON_DISCRETIONARY_CATEGORIES: ReadonlySet<FinanceCategory> = new Set<FinanceCategory>([
  'Income',
  'Refunds',
  'Transfers',
  'Cash',
  'Bills & utilities',
])

export type ClassifiableRow = {
  id: string
  amountCents: Cents
  amountSource: AmountSource
  category: FinanceCategory
  transferKind: TransferKind
  hasUserMemo: boolean
  /** Optional so older callers keep compiling; absent reads as "not income". */
  memoNamesReceivedIncome?: boolean
}

/** True for the flow classes that represent money moving inside the household. */
export function isInternalFlow(flow: FlowClass): boolean {
  return flow === 'INTERNAL_MATCHED' || flow === 'INTERNAL_UNMATCHED_IN' || flow === 'INTERNAL_UNMATCHED_OUT'
}

/** True for the flow classes that contribute to no total at all. */
export function isExcludedFlow(flow: FlowClass): boolean {
  return isInternalFlow(flow) || flow === 'ZERO' || flow === 'UNKNOWN_SIGN'
}

export function classifyFlow(row: ClassifiableRow, pairedIds: ReadonlySet<string>): FlowClass {
  if (row.amountCents === 0) return 'ZERO'
  if (row.amountSource === 'UNKNOWN') return 'UNKNOWN_SIGN'
  if (row.category === 'Refunds') return 'REFUND'
  if (pairedIds.has(row.id)) return 'INTERNAL_MATCHED'

  if (row.transferKind === 'OWN_ACCOUNT') {
    // A credit from your own account is never new money, even when the sending
    // leg sits in an account you have not connected.
    if (row.amountCents > 0) return 'INTERNAL_UNMATCHED_IN'
    // A debit to your own account with a memo on it ("wolt greens", "qashqai
    // diesel") is a purchase made from that other account, and the memo is what
    // gives it a category. Without a memo there is nothing to suggest it bought
    // anything, so treat it as a balance shuffle.
    //
    // A memo naming received income ("children's allowance") is the exception:
    // it says where the money came from, not what it bought, so the leg is still
    // a shuffle. Counting it turned money the household was paid into spending.
    if (!row.hasUserMemo || row.memoNamesReceivedIncome) return 'INTERNAL_UNMATCHED_OUT'
  }

  return row.amountCents > 0 ? 'INCOME' : 'SPENDING'
}
