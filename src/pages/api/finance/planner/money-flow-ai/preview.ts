import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireFinanceAccess } from '@/lib/finance/access'
import { loadPlannerData } from '@/lib/finance/planner-data'
import { buildMoneyFlowAiPayload } from '@/lib/finance/money-flow-ai'
import { moneyFlowStateHash } from '@/lib/finance/money-flow-ai-server'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  const data = await loadPlannerData(access.householdId, new Date(), access.userId)
  if (!data.accounts.length) return res.status(400).json({ error: 'Set up planning accounts before using AI organisation' })
  const [payload, stateHash] = await Promise.all([
    Promise.resolve(buildMoneyFlowAiPayload(data)),
    moneyFlowStateHash(prisma, access.householdId, access.userId),
  ])
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ payload, stateHash })
}

export default withApiHandler(handler)

