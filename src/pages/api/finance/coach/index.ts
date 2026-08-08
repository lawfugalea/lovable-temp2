import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { loadAnalyticsInput } from '@/lib/finance/analytics-server'
import { buildBudgetProgress } from '@/lib/finance/budgets'
import { classifyTransactions } from '@/lib/finance/analytics'
import { buildCoachSignals } from '@/lib/finance/coach'

/** The coach compares the last 30 days with the 30 before them. */
const COACH_PERIOD_DAYS = 30

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null

  const now = new Date()
  const loaded = await loadAnalyticsInput({ access, periodDays: COACH_PERIOD_DAYS, accountId, now })
  if (!loaded.ok) return res.status(404).json({ error: 'Bank account not found' })
  const { limits } = loaded.input

  const [subscriptions, feedback] = await Promise.all([
    prisma.financeSubscription.findMany({
      where: { accountId: { in: loaded.accountIds }, status: 'CONFIRMED' },
      select: { accountId: true, merchantKey: true },
    }),
    prisma.financeCoachFeedback.findMany({ where: { userId: access.userId } }),
  ])

  // Limit progress has to know which debits were only internal movement, so this
  // is the same pairing and classification analytics uses.
  const { classified } = classifyTransactions(loaded.input)

  const confirmedKeys = new Set(subscriptions.map(item => `${item.accountId}|${item.merchantKey}`))
  const allSignals = buildCoachSignals(
    classified.map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      merchantName: transaction.merchantName,
      category: transaction.category,
      signedAmount: transaction.amountCents / 100,
      currency: transaction.currency,
      bookingDate: transaction.bookingDate,
      status: transaction.status,
    })),
    confirmedKeys,
  )
  const feedbackByKey = new Map(feedback.map(item => [item.signalKey, item]))
  const signals = allSignals.filter(signal => {
    const item = feedbackByKey.get(signal.key)
    if (!item) return true
    if (item.state === 'DISMISSED') return false
    return !item.snoozedUntil || item.snoozedUntil <= now
  })

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    canManage: access.canManage,
    signals,
    hiddenSignalCount: allSignals.length - signals.length,
    // Cents plus the decimal fields the current coach panel reads. The panel is
    // rebuilt in the next phase, at which point the decimals can go.
    limits: buildBudgetProgress(limits, classified, now).map(budget => ({
      ...budget,
      amount: budget.limitCents / 100,
      spent: budget.spentCents / 100,
      projected: (budget.projectedCents ?? budget.spentCents) / 100,
    })),
    defaults: { discretionaryOnly: true, periodDays: 30, smallPurchaseAmount: 15 },
  })
}

export default withApiHandler(handler)
