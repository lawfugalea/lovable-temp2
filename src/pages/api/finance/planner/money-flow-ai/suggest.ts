import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { loadPlannerData } from '@/lib/finance/planner-data'
import {
  buildMoneyFlowAiPayload,
  requestMoneyFlowAiProposal,
  signMoneyFlowAiProposal,
} from '@/lib/finance/money-flow-ai'
import { moneyFlowStateHash } from '@/lib/finance/money-flow-ai-server'
import { prisma } from '@/lib/prisma'
import { createRateLimit } from '@/lib/rate-limiter'

const moneyFlowAiRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  if (req.body?.consent !== true) return res.status(400).json({ error: 'Review and consent to the exact AI payload first' })
  if (!isDeepSeekConfigured()) return res.status(503).json({ error: 'AI organisation is not configured' })
  if (!(await moneyFlowAiRateLimit(req, res))) return
  const data = await loadPlannerData(access.householdId, new Date(), access.userId)
  const payload = buildMoneyFlowAiPayload(data)
  const stateHash = await moneyFlowStateHash(prisma, access.householdId, access.userId)
  if (typeof req.body?.stateHash !== 'string' || req.body.stateHash !== stateHash) {
    return res.status(409).json({ error: 'The money plan changed. Review the updated payload before continuing.' })
  }
  try {
    const operations = await requestMoneyFlowAiProposal(payload)
    const proposalToken = signMoneyFlowAiProposal({
      householdId: access.householdId,
      userId: access.userId,
      stateHash,
      operations,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ operations, proposalToken, expiresInSeconds: 900 })
  } catch (error) {
    console.error('Money-flow AI proposal failed:', error)
    return res.status(502).json({ error: error instanceof Error ? error.message : 'AI proposal failed' })
  }
}

export default withApiHandler(handler)

