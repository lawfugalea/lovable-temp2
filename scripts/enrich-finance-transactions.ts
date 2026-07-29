/**
 * Restore the raw provider text on stored bank transactions.
 *
 * History: this script used to write *enriched* values into `amount`,
 * `counterparty` and `description`. That was wrong in three ways — its no-op
 * guard compared a Decimal string ("-24.5000") against a float string ("-24.5")
 * so it rewrote every row on every run; it replaced `description` with the
 * generic transaction type when there was no detail, which permanently collapsed
 * those rows to merchant "Payment" and category "Other" on the next pass; and
 * storing derived text is what made a transaction's dedup identity depend on our
 * own naming rules.
 *
 * Enrichment now happens on read, so the stored columns should hold exactly what
 * the bank said. This script repairs rows still holding the derived form.
 *
 *   node --require ts-node/register scripts/enrich-finance-transactions.ts
 *   node --require ts-node/register scripts/enrich-finance-transactions.ts --apply
 *
 * Reports without `--apply`. `amount` is never touched.
 */
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

async function main() {
  const apply = process.argv.includes('--apply')
  const [{ prisma }, { providerTextFields }] = await Promise.all([
    import('../src/lib/prisma'),
    import('../src/lib/finance/normalization'),
  ])
  const transactions = await prisma.bankTransaction.findMany({
    select: { id: true, counterparty: true, description: true, providerData: true },
  })

  const stale: Array<{ id: string; from: string; to: string }> = []
  for (const transaction of transactions) {
    if (!transaction.providerData || typeof transaction.providerData !== 'object') continue
    const raw = providerTextFields(transaction.providerData as Record<string, unknown>)
    if (raw.counterparty === transaction.counterparty && raw.description === transaction.description) continue
    stale.push({
      id: transaction.id,
      from: `${transaction.counterparty ?? '—'} / ${transaction.description ?? '—'}`,
      to: `${raw.counterparty ?? '—'} / ${raw.description ?? '—'}`,
    })
    if (!apply) continue
    await prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: { counterparty: raw.counterparty, description: raw.description },
    })
  }

  for (const row of stale.slice(0, 10)) console.log(`  ${row.from}\n    → ${row.to}`)
  if (stale.length > 10) console.log(`  … and ${stale.length - 10} more`)
  console.log(
    apply
      ? `Restored provider text on ${stale.length} of ${transactions.length} transactions.`
      : `${stale.length} of ${transactions.length} transactions hold derived text. Re-run with --apply to restore.`,
  )
  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Finance enrichment repair failed')
  process.exitCode = 1
})
