import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireFinanceAccess } from '@/lib/finance/access'
import { buildBankingAnalytics } from '@/lib/finance/analytics'
import { loadAnalyticsInput } from '@/lib/finance/analytics-server'

const ALLOWED_PERIODS = new Set([30, 90, 180, 365])

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return

  const periodDays = Number(req.query.days || 90)
  if (!ALLOWED_PERIODS.has(periodDays)) {
    return res.status(400).json({ error: 'days must be one of 30, 90, 180, or 365' })
  }
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null

  const loaded = await loadAnalyticsInput({ access, periodDays, accountId, now: new Date() })
  if (!loaded.ok) return res.status(404).json({ error: 'Bank account not found' })

  const analytics = buildBankingAnalytics(loaded.input)
  const requestedCurrency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : null
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    ...analytics,
    // A currency filter narrows the payload rather than changing the arithmetic,
    // so an unknown currency simply returns nothing for it.
    currencies: requestedCurrency
      ? analytics.currencies.filter(entry => entry.currency === requestedCurrency)
      : analytics.currencies,
  })
}

export default withApiHandler(handler)
