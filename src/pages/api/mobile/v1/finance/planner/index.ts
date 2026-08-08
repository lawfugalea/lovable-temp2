import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileFinancePlannerResponse } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { suggestedEmergencyFundCents } from '@/lib/budget'
import { loadPlannerData } from '@/lib/finance/planner-data'
import { isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import { financePeriod, isFinancePeriod } from '@/lib/finance/money-flow'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileFinancePlannerResponse | MobileApiError>) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).json({ error: 'Method not allowed' }) }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return
  const period = isFinancePeriod(req.query.period) ? req.query.period : financePeriod()
  const data = await loadPlannerData(access.householdId, new Date(), access.userId, period)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ ...data, suggestedEmergencyFundCents: suggestedEmergencyFundCents(data.summary), aiConfigured: isDeepSeekConfigured(), bankEnabled: access.bankEnabled })
}

export default withApiHandler(handler)
