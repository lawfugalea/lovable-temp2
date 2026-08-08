import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireFinanceAccess } from '@/lib/finance/access'
import { loadPlannerData } from '@/lib/finance/planner-data'
import { suggestedEmergencyFundCents } from '@/lib/budget'
import { isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { financePeriod, isFinancePeriod } from '@/lib/finance/money-flow'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return

  const period = isFinancePeriod(req.query.period) ? req.query.period : financePeriod()
  const data = await loadPlannerData(access.householdId, new Date(), access.userId, period)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    ...data,
    suggestedEmergencyFundCents: suggestedEmergencyFundCents(data.summary),
    aiConfigured: isDeepSeekConfigured(),
    bankEnabled: access.bankEnabled,
  })
}

export default withApiHandler(handler)
