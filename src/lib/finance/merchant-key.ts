/**
 * Merchant keys.
 *
 * Two of them, deliberately:
 *
 * - `normalizeMerchantKey` is an *identity* key. Stored rows depend on it —
 *   `FinanceSubscription.merchantKey`, `FinanceLimit.scopeKey` and every learned
 *   `FinancePatternRule.matchValue` — so changing what it produces would silently
 *   orphan limits and rules the household created. It is frozen by that contract.
 *
 * - `merchantGroupKey` is an *aggregation* key, free to be more aggressive. It
 *   exists because statistics previously grouped merchants by display name, which
 *   split "Cheque Withdrawal 000055" from "…000057", "IGP Operations Limited" from
 *   "Igp Operations Limited", and every masked mobile-pay recipient from the next.
 *   Rankings understated real concentration as a result.
 */

/** Identity key. Stored in the database — see the note above before changing. */
export function normalizeMerchantKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(?:pos|card|payment|purchase|sumup|direct debit)\b/g, ' ')
    .replace(/\b(?:limited|ltd|plc|company|co)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

/** Aggregation key. Never stored; safe to tighten whenever grouping improves. */
export function merchantGroupKey(value: string): string {
  const identity = normalizeMerchantKey(value)
  const grouped = identity
    // Masked recipients: "from n a to 0786" and "…0888" are one mobile-pay group.
    .replace(/^from n a to\b.*$/, 'mobile pay')
    // Trailing serials: cheque and reference numbers are per-transaction, not
    // per-merchant.
    .replace(/\s+\d{3,}$/, '')
    .replace(/\s+\d{3,}\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return grouped || identity || 'unknown'
}
