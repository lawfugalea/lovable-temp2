/**
 * Reconstruct how the total balance moved over recent months.
 *
 * The bank reports today's balance and nothing else, and `syncBankConnection`
 * keeps only the latest value, so there is no stored history to plot. But closing
 * balance = opening balance + everything that happened in between, which makes
 * `balance(t) = balance(now) − Σ transactions after t` an identity rather than an
 * estimate. In integer cents it is exact, it works retroactively over all the
 * history already stored, and the range it can cover only grows.
 *
 * Internal transfers are included here on purpose. Excluding them is about not
 * double counting *statistics*; the money genuinely moved, and a matched pair
 * between two accounts in this set nets to zero anyway.
 */
import type {
  AnalyticsAccountInput,
  AnalyticsTransactionInput,
  BalanceTrend,
  BalanceTrendPoint,
} from './analytics-types'
import { isAvailableBalanceType, isBookedBalanceType } from './normalization'
import type { Cents } from './money'

const DEFAULT_MONTHS = 6

function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0))
}

/** Balance types we recognise; anything else is reported as unverified. */
function isKnownBalanceType(type: string | null): boolean {
  if (!type) return false
  return isAvailableBalanceType(type) || isBookedBalanceType(type)
}

export function deriveBalanceTrend(
  accounts: readonly AnalyticsAccountInput[],
  transactions: readonly AnalyticsTransactionInput[],
  currency: string,
  now: Date,
  months = DEFAULT_MONTHS,
): BalanceTrend | null {
  const relevant = accounts.filter(account => account.currency.toUpperCase() === currency)
  if (!relevant.length) return null
  if (relevant.every(account => account.balanceCents === null)) return null

  const currentTotal = relevant.reduce<Cents>((total, account) => total + (account.balanceCents ?? 0), 0)
  const booked = transactions
    .filter(transaction => transaction.status === 'BOOKED'
      && transaction.bookingDate
      && transaction.currency.toUpperCase() === currency)
    .sort((left, right) => (left.bookingDate as Date).getTime() - (right.bookingDate as Date).getTime())

  const earliest = booked[0]?.bookingDate ?? null
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const boundaries: Date[] = []
  for (let offset = months - 1; offset >= 1; offset -= 1) {
    const end = monthEnd(now.getUTCFullYear(), now.getUTCMonth() - offset)
    // Never invent a point for a period we have no transactions for: the walk
    // backwards would silently present today's balance as that month's.
    if (earliest && end < earliest) continue
    boundaries.push(end)
  }

  const points: BalanceTrendPoint[] = boundaries.map(boundary => {
    let after = 0
    for (const transaction of booked) {
      if ((transaction.bookingDate as Date) > boundary) after += transaction.amountCents
    }
    return {
      date: boundary.toISOString().slice(0, 10),
      balanceCents: currentTotal - after,
      derived: true,
    }
  })
  points.push({ date: today.toISOString().slice(0, 10), balanceCents: currentTotal, derived: false })

  const caveats: string[] = []
  if (relevant.some(account => account.balanceCents === null)) {
    caveats.push('one account has not reported a balance yet')
  }
  if (relevant.some(account => !isKnownBalanceType(account.balanceType))) {
    caveats.push('the bank did not label which kind of balance it reported')
  }
  if (transactions.some(transaction => transaction.status === 'PENDING')) {
    caveats.push('pending transactions are not included')
  }
  if (points.length < 2) {
    caveats.push('there is not enough history yet to show a trend')
  }

  return {
    points,
    reliable: caveats.length === 0,
    caveat: caveats.length ? `Worked backwards from today's balance, but ${caveats.join('; ')}.` : null,
  }
}
