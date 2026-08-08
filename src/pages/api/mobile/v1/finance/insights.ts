import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileFinanceInsightsResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { buildBankingAnalytics } from '@/lib/finance/analytics'
import { loadAnalyticsInput } from '@/lib/finance/analytics-server'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'

const ALLOWED_PERIODS = new Set([30, 90, 180, 365])

/**
 * The phone reads the same analytics the banking web page does. Only the
 * projection differs: the app renders a headline summary and category
 * breakdown, so the richer per-transaction, budget, and forecast sections are
 * dropped here rather than recomputed by a second implementation.
 */
async function handler(req: NextApiRequest, res: NextApiResponse<MobileFinanceInsightsResponse | MobileApiError>) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).json({ error: 'Method not allowed' }) }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return

  const periodDays = Number(req.query.days || 90)
  if (!ALLOWED_PERIODS.has(periodDays)) return res.status(400).json({ error: 'days must be one of 30, 90, 180, or 365' })

  const loaded = await loadAnalyticsInput({ access, periodDays, accountId: null, now: new Date() })
  if (!loaded.ok) return res.status(404).json({ error: 'Bank account not found' })
  const analytics = buildBankingAnalytics(loaded.input)

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    periodDays: analytics.periodDays,
    dateFrom: analytics.dateFrom,
    dateTo: analytics.dateTo,
    primaryCurrency: analytics.primaryCurrency,
    currencies: analytics.currencies.map(entry => ({
      currency: entry.currency,
      summary: {
        incomeCents: entry.summary.incomeCents,
        spendingCents: entry.summary.spendingCents,
        netSpendingCents: entry.summary.netSpendingCents,
        netCents: entry.summary.netCents,
        savingsRatePercent: entry.summary.savingsRatePercent,
        largestExpenseCents: entry.summary.largestExpenseCents,
        averageSpendPerTransactionCents: entry.summary.averageSpendPerTransactionCents,
      },
      categories: entry.categories.map(category => ({
        category: category.category,
        amountCents: category.amountCents,
        previousAmountCents: category.previousAmountCents,
        changePercent: category.changePercent,
        count: category.count,
        sharePercent: category.sharePercent,
        averageCents: category.averageCents,
        largestCents: category.largestCents,
        merchantCount: category.merchantCount,
      })),
      merchants: entry.merchants.map(merchant => ({
        merchantName: merchant.merchantName,
        amountCents: merchant.amountCents,
        count: merchant.count,
        averageCents: merchant.averageCents,
        sharePercent: merchant.sharePercent,
        category: merchant.primaryCategory,
      })),
    })),
  })
}

export default withApiHandler(handler)
