import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

async function main() {
  const [{ prisma }, { enrichTransaction }] = await Promise.all([
    import('../src/lib/prisma'),
    import('../src/lib/finance/enrichment'),
  ])
  const transactions = await prisma.bankTransaction.findMany({
    select: {
      id: true,
      amount: true,
      counterparty: true,
      description: true,
      providerData: true,
    },
  })
  let updated = 0
  for (let index = 0; index < transactions.length; index += 50) {
    const batch = transactions.slice(index, index + 50)
    await Promise.all(batch.map(async transaction => {
      const enriched = enrichTransaction({
        amount: transaction.amount.toString(),
        counterparty: transaction.counterparty,
        description: transaction.description,
        providerData: transaction.providerData,
      })
      const amount = enriched.signedAmount.toString()
      const description = enriched.detail || enriched.transactionType
      if (
        transaction.amount.toString() === amount
        && transaction.counterparty === enriched.merchantName
        && transaction.description === description
      ) return
      await prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: {
          amount,
          counterparty: enriched.merchantName,
          description,
        },
      })
      updated += 1
    }))
  }
  console.log(`Enriched ${updated} of ${transactions.length} stored finance transactions.`)
  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Finance enrichment failed')
  process.exitCode = 1
})
