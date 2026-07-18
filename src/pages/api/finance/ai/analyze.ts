import type { NextApiRequest, NextApiResponse } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import {
  buildRedactedFinancePayload,
  deepSeekModel,
  hashRedactedPayload,
  isDeepSeekConfigured,
  requestDeepSeekFinanceAnalysis,
} from '@/lib/finance/deepseek'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  if (!isDeepSeekConfigured()) return res.status(503).json({ error: 'DeepSeek is not configured' })
  let preference = await prisma.financeAiPreference.findUnique({ where: { userId: access.userId } })
  const alreadyConsented = Boolean(preference?.consentedAt && !preference.revokedAt)
  if (!alreadyConsented && req.body?.consent !== true) {
    return res.status(409).json({ error: 'Review the redacted payload and provide consent first' })
  }
  if (!alreadyConsented) {
    preference = await prisma.financeAiPreference.upsert({
      where: { userId: access.userId },
      create: { userId: access.userId, consentedAt: new Date(), revokedAt: null },
      update: { consentedAt: new Date(), revokedAt: null },
    })
  }
  const accounts = await prisma.bankAccount.findMany({ where: accessibleBankAccountWhere(access), select: { id: true, connection: { select: { userId: true } } } })
  const requestedAccountId = typeof req.body?.accountId === 'string' && req.body.accountId ? req.body.accountId : null
  const accountIds = accounts.map(account => account.id).filter(id => !requestedAccountId || id === requestedAccountId)
  if (requestedAccountId && !accountIds.length) return res.status(404).json({ error: 'Bank account not found' })
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 90)
  const transactions = accountIds.length ? await prisma.bankTransaction.findMany({ where: { accountId: { in: accountIds }, status: 'BOOKED', bookingDate: { gte: from } } }) : []
  const metadata = await loadFinanceMetadata(accountIds, [...new Set(accounts.map(account => account.connection.userId))], transactions.map(transaction => transaction.id))
  const enriched = transactions.map(transaction => ({ id: transaction.id, accountId: transaction.accountId, currency: transaction.currency, bookingDate: transaction.bookingDate, status: transaction.status, ...enrichStoredTransaction(transaction, metadata) }))
  const payload = buildRedactedFinancePayload(enriched)
  if (!payload.currencies.length) return res.status(400).json({ error: 'There are no outgoing transactions to analyze' })
  const inputHash = hashRedactedPayload(payload)
  const cached = await prisma.financeAiAnalysis.findUnique({ where: { userId_inputHash: { userId: access.userId, inputHash } } })
  if (cached && cached.expiresAt > new Date()) return res.status(200).json({ cached: true, analysis: cached.result, createdAt: cached.createdAt })
  const recentCalls = await prisma.financeAiAnalysis.count({ where: { userId: access.userId, createdAt: { gte: new Date(Date.now() - 3_600_000) } } })
  if (recentCalls >= 3) return res.status(429).json({ error: 'AI analysis is limited to three new requests per hour' })
  try {
    const result = await requestDeepSeekFinanceAnalysis(payload)
    const analysis = await prisma.financeAiAnalysis.upsert({
      where: { userId_inputHash: { userId: access.userId, inputHash } },
      create: {
        userId: access.userId, inputHash, model: deepSeekModel(), accountIds: accountIds as Prisma.InputJsonValue,
        payloadSummary: payload as unknown as Prisma.InputJsonValue, result: result as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      update: {
        model: deepSeekModel(), accountIds: accountIds as Prisma.InputJsonValue,
        payloadSummary: payload as unknown as Prisma.InputJsonValue, result: result as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date(),
      },
    })
    return res.status(200).json({ cached: false, analysis: result, createdAt: analysis.createdAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek analysis failed"
    console.error("[finance-ai] DeepSeek analysis failed:", message)
    return res.status(502).json({ error: message })
  }
}
