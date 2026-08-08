/**
 * Ask the bank for more transaction history than the usual sync window.
 *
 * Why this exists: `syncBankConnection` requests `INITIAL_HISTORY_DAYS` on a
 * first sync and only a short overlap afterwards, so once a connection has any
 * transactions it never reaches further back. That made our own 90-day window
 * look like the bank's limit — the earliest stored transaction sat exactly on the
 * boundary with a full day of activity on it, which is a cut-off rather than the
 * start of the account.
 *
 * Banks decide for themselves how far back they will go, and often give more
 * inside the window of a consent that was just authorised with SCA. This asks,
 * reports what actually came back per account, and only writes with `--apply`.
 *
 * Each account costs one provider access, and PSD2 lets a bank cap unattended
 * access at a handful per account per day, so it fetches booked transactions only
 * — no balances, no account details, no pending. A rate-limited account is
 * reported and the run continues.
 *
 *   node --require ts-node/register scripts/backfill-finance-history.ts
 *   node --require ts-node/register scripts/backfill-finance-history.ts --apply --days=730
 */
import Module from 'node:module'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

// ts-node does not apply the tsconfig `paths` mapping at require time.
const host = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string
}
const originalResolve = host._resolveFilename
host._resolveFilename = function patched(request, parent, isMain, options) {
  const mapped = request.startsWith('@/') ? path.join(process.cwd(), 'src', request.slice(2)) : request
  return originalResolve.call(this, mapped, parent, isMain, options)
}

const DEFAULT_DAYS = 730

function argValue(name: string): string | null {
  const match = process.argv.find(argument => argument.startsWith(`--${name}=`))
  return match ? match.slice(name.length + 3) : null
}

async function main() {
  const apply = process.argv.includes('--apply')
  const days = Number(argValue('days') ?? DEFAULT_DAYS)
  if (!Number.isFinite(days) || days < 1) throw new Error('--days must be a positive number')

  const [{ prisma }, { getProviderTransactions, EnableBankingError }, { normalizeTransaction }] = await Promise.all([
    import('../src/lib/prisma'),
    import('../src/lib/finance/enable-banking'),
    import('../src/lib/finance/normalization'),
  ])

  const connections = await prisma.bankConnection.findMany({
    where: { providerSessionId: { not: null } },
    include: { accounts: { select: { id: true, providerAccountId: true, displayName: true, maskedIdentifier: true } } },
  })
  if (!connections.length) throw new Error('no authorized bank connection')

  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  console.log(`Asking for booked transactions from ${dateFrom} (${days} days).`)
  console.log(apply ? 'New rows will be stored.\n' : 'Reporting only; pass --apply to store what comes back.\n')

  for (const connection of connections) {
    for (const account of connection.accounts) {
      const label = account.maskedIdentifier || account.displayName
      const before = await prisma.bankTransaction.aggregate({
        where: { accountId: account.id },
        _min: { bookingDate: true },
        _count: true,
      })

      let rows: Record<string, unknown>[]
      try {
        rows = await getProviderTransactions({
          accountId: account.providerAccountId,
          dateFrom,
          transactionStatus: 'BOOK',
        })
      } catch (error) {
        const message = error instanceof EnableBankingError ? error.message : String(error)
        console.log(`${label}: could not fetch — ${message}`)
        continue
      }

      const normalized = rows.map(row => normalizeTransaction(row, 'BOOKED')).filter(Boolean)
      const dates = normalized
        .map(row => row?.bookingDate)
        .filter((date): date is Date => date instanceof Date)
        .sort((left, right) => left.getTime() - right.getTime())
      const earliest = dates[0]?.toISOString().slice(0, 10) ?? 'none'
      const storedEarliest = before._min.bookingDate?.toISOString().slice(0, 10) ?? 'none'

      if (apply) {
        for (const transaction of normalized) {
          if (!transaction) continue
          await prisma.bankTransaction.upsert({
            where: {
              accountId_deduplicationKey: {
                accountId: account.id,
                deduplicationKey: transaction.deduplicationKey,
              },
            },
            create: {
              accountId: account.id,
              deduplicationKey: transaction.deduplicationKey,
              providerTransactionId: transaction.providerTransactionId,
              status: transaction.status,
              amount: transaction.amount,
              currency: transaction.currency,
              bookingDate: transaction.bookingDate,
              valueDate: transaction.valueDate,
              counterparty: transaction.counterparty,
              description: transaction.description,
              providerData: transaction.providerData as never,
            },
            update: {},
          })
        }
      }

      // Counted by what the table actually gained. An earlier version inferred it
      // from createdAt === updatedAt, which reported every row as new.
      const after = apply
        ? await prisma.bankTransaction.count({ where: { accountId: account.id } })
        : before._count

      console.log(
        `${label}: bank returned ${normalized.length} booked rows from ${earliest}`
        + ` (stored history started ${storedEarliest}, ${before._count} rows)`
        + (apply ? ` — ${after - before._count} added` : ''),
      )
    }
  }

  const overall = await prisma.bankTransaction.aggregate({ _min: { bookingDate: true }, _count: true })
  console.log(
    `\nStored history now starts ${overall._min.bookingDate?.toISOString().slice(0, 10)}`
    + ` across ${overall._count} transactions.`,
  )
  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
