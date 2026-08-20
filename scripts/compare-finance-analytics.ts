/**
 * Read-only comparison of the old and new statistics, so every figure that moves
 * on the banking page can be explained before it ships.
 *
 * The old numbers are recomputed here from the same rows using the previous
 * rules (classify by sign, no transfer handling, nominal-period averages), rather
 * than being read from anywhere — nothing is written and no old code is called.
 *
 *   node --require ts-node/register scripts/compare-finance-analytics.ts [days...]
 */
import Module from 'node:module'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

// ts-node does not apply the tsconfig `paths` mapping at require time, so the
// `@/...` imports inside src fail to resolve from a script. Same shim the test
// harness uses.
const host = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string
}
const originalResolve = host._resolveFilename
host._resolveFilename = function patched(request, parent, isMain, options) {
  const mapped = request.startsWith('@/')
    ? path.join(process.cwd(), 'src', request.slice(2))
    : request
  return originalResolve.call(this, mapped, parent, isMain, options)
}

const PERIODS = process.argv.slice(2).map(Number).filter(Number.isFinite)

function euros(cents: number): string {
  return `€${(cents / 100).toLocaleString('en-MT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function main() {
  const [{ prisma }, analytics, { classifyTransactions }, { toAnalyticsTransaction, enrichStoredTransaction, loadFinanceMetadata }] = await Promise.all([
    import('../src/lib/prisma'),
    import('../src/lib/finance/analytics'),
    import('../src/lib/finance/analytics'),
    import('../src/lib/finance/server-metadata'),
  ])

  const accounts = await prisma.bankAccount.findMany({
    select: {
      id: true, displayName: true, customName: true, maskedIdentifier: true, currency: true,
      connection: { select: { userId: true } },
      balances: { select: { balanceType: true, currency: true, amount: true, updatedAt: true, referenceDate: true } },
    },
  })
  const rows = await prisma.bankTransaction.findMany({
    select: {
      id: true, accountId: true, amount: true, currency: true, status: true,
      bookingDate: true, valueDate: true, counterparty: true, description: true, providerData: true,
    },
    orderBy: { bookingDate: 'asc' },
  })
  const metadata = await loadFinanceMetadata(
    accounts.map(account => account.id),
    [...new Set(accounts.map(account => account.connection.userId))],
    rows.map(row => row.id),
  )
  const transactions = rows.map(row => toAnalyticsTransaction(row, enrichStoredTransaction(row, metadata)))
  console.log(`${rows.length} transactions across ${accounts.length} accounts.\n`)

  const { matched, classified } = classifyTransactions({ transactions, accounts })
  console.log(`Internal transfers: ${matched.pairs.length} matched pairs, ${matched.unmatched.length} one-sided.`)
  for (const pair of matched.pairs.slice(0, 5)) {
    console.log(`  ${pair.date}  ${euros(pair.amountCents)}  ${pair.confidence.toLowerCase()}`)
  }
  const byClass = new Map<string, { count: number; cents: number }>()
  for (const row of classified) {
    const bucket = byClass.get(row.flowClass) || { count: 0, cents: 0 }
    bucket.count += 1
    bucket.cents += Math.abs(row.amountCents)
    byClass.set(row.flowClass, bucket)
  }
  console.log('\nEvery transaction, by what it actually is:')
  for (const [flow, bucket] of [...byClass].sort((left, right) => right[1].cents - left[1].cents)) {
    console.log(`  ${flow.padEnd(22)} ${String(bucket.count).padStart(4)} rows  ${euros(bucket.cents).padStart(14)}`)
  }

  for (const periodDays of PERIODS.length ? PERIODS : [30, 90, 365]) {
    const now = new Date()
    const result = analytics.buildBankingAnalytics({
      transactions,
      accounts: accounts.map(account => {
        const balance = account.balances[0]
        return {
          id: account.id,
          displayName: account.customName || account.displayName,
          currency: account.currency,
          maskedIdentifier: account.maskedIdentifier,
          balanceCents: balance ? Math.round(Number(balance.amount) * 100) : null,
          balanceType: balance?.balanceType ?? null,
          balanceAsOf: balance?.referenceDate ?? balance?.updatedAt ?? null,
        }
      }),
      limits: [],
      subscriptions: [],
      periodDays,
      now,
    })
    const entry = result.currencies[0]
    if (!entry) {
      console.log(`\n${periodDays} days: no data.`)
      continue
    }

    // The previous rules, for comparison only.
    const range = analytics.analyticsDateRange(periodDays, now)
    const window = transactions.filter(row => row.bookingDate
      && row.bookingDate >= range.dateFrom
      && row.bookingDate < range.currentEnd
      && row.status === 'BOOKED'
      && row.currency.toUpperCase() === entry.currency)
    const oldIncome = window.filter(row => row.amountCents >= 0).reduce((total, row) => total + row.amountCents, 0)
    const oldOutgoing = window.filter(row => row.amountCents < 0).reduce((total, row) => total + Math.abs(row.amountCents), 0)
    const oldMerchants = new Map<string, number>()
    for (const row of window.filter(item => item.amountCents < 0)) {
      oldMerchants.set(row.merchantName, (oldMerchants.get(row.merchantName) || 0) + Math.abs(row.amountCents))
    }
    const oldTop = [...oldMerchants].sort((left, right) => right[1] - left[1])[0]
    const newTop = entry.merchants[0]

    console.log(`\n=== ${periodDays} days (${entry.coverage.coveredDays} with data) ===`)
    const line = (label: string, before: string, after: string) =>
      console.log(`  ${label.padEnd(22)} was ${before.padStart(14)}   now ${after.padStart(14)}`)
    line('Money in', euros(oldIncome), euros(entry.summary.incomeCents))
    line('Money out', euros(oldOutgoing), euros(entry.summary.spendingCents))
    line('Net', euros(oldIncome - oldOutgoing), euros(entry.summary.netCents))
    line(
      'Savings rate',
      oldIncome > 0 ? `${Math.round((oldIncome - oldOutgoing) / oldIncome * 100)}%` : '—',
      entry.summary.savingsRatePercent === null ? '—' : `${entry.summary.savingsRatePercent}%`,
    )
    line('Daily average out', euros(Math.round(oldOutgoing / periodDays)), euros(entry.summary.averageSpendPerDayCents))
    line('Top merchant', oldTop ? `${oldTop[0]}` : '—', newTop ? newTop.merchantName : '—')
    line('  its total', oldTop ? euros(oldTop[1]) : '—', newTop ? euros(newTop.amountCents) : '—')
    line('Distinct merchants', String(oldMerchants.size), String(entry.merchants.length))
    if (entry.internalTransfers.note) console.log(`  note: ${entry.internalTransfers.note}`)
    for (const message of entry.dataQuality.messages) console.log(`  data: ${message}`)
  }

  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
