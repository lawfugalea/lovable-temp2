/**
 * The banking dashboard's summary payload.
 *
 * Deliberately separate from `/api/finance/overview`: that route is fetched on
 * every banking page load and also serves households with no bank connection at
 * all, so multi-month aggregation does not belong in it.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireFinanceAccess } from '@/lib/finance/access'
import { buildBankingAnalytics } from '@/lib/finance/analytics'
import { loadAnalyticsInput } from '@/lib/finance/analytics-server'

const DASHBOARD_PERIOD_DAYS = 30

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return

  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
  const loaded = await loadAnalyticsInput({
    access,
    periodDays: DASHBOARD_PERIOD_DAYS,
    accountId,
    now: new Date(),
  })
  if (!loaded.ok) return res.status(404).json({ error: 'Bank account not found' })

  const analytics = buildBankingAnalytics(loaded.input)
  const primary = analytics.currencies[0] ?? null

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    primaryCurrency: analytics.primaryCurrency,
    currencies: analytics.currencies.map(entry => entry.currency),
    accountCount: loaded.accountIds.length,
    hasTransactions: loaded.input.transactions.length > 0,
    summary: primary?.summary ?? null,
    coverage: primary?.coverage ?? null,
    currentMonth: primary?.currentMonth ?? null,
    balanceTrend: primary?.balanceTrend ?? null,
    budgets: primary?.budgets ?? [],
    upcomingBills: primary?.upcomingBills ?? [],
    internalTransfers: primary?.internalTransfers ?? null,
    daily: primary?.daily ?? [],
    dataQuality: primary?.dataQuality ?? null,
  })
}

export default withApiHandler(handler)
