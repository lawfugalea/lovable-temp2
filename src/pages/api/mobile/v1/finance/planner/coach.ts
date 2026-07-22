import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileFinanceCoachResponse } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { loadPlannerData } from '@/lib/finance/planner-data'
import { buildRedactedPlannerPayload, requestDeepSeekPlannerAnalysis } from '@/lib/finance/planner-coach'
import { prisma } from '@/lib/prisma'
import { createRateLimit } from '@/lib/rate-limiter'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'

const mobilePlannerCoachRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20 })

async function handler(req: NextApiRequest, res: NextApiResponse<MobileFinanceCoachResponse | MobileApiError>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return
  if (!isDeepSeekConfigured()) return res.status(503).json({ error: 'AI analysis is not configured on this deployment' })
  if (!(await mobilePlannerCoachRateLimit(req, res))) return

  const data = await loadPlannerData(access.householdId)
  if (!data.incomes.length && !data.commitments.length) {
    return res.status(400).json({ error: 'Add income and commitments before requesting a savings plan' })
  }
  const preview = buildRedactedPlannerPayload(data)
  res.setHeader('Cache-Control', 'private, no-store')
  // A previous web or mobile preference must never skip the mobile review step.
  // Every fresh mobile coach flow starts with the exact redacted payload preview.
  if (req.body?.consent !== true) return res.status(200).json({ requiresConsent: true, preview })

  const preference = await prisma.financeAiPreference.findUnique({ where: { userId: access.userId } })
  const consented = Boolean(preference?.consentedAt) && !preference?.revokedAt
  if (!consented) {
    await prisma.financeAiPreference.upsert({
      where: { userId: access.userId },
      create: { userId: access.userId, consentedAt: new Date(), revokedAt: null },
      update: { consentedAt: new Date(), revokedAt: null },
    })
  }
  try {
    const result = await requestDeepSeekPlannerAnalysis(preview)
    return res.status(200).json({ requiresConsent: false, ...result, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Mobile planner coach analysis failed:', error)
    return res.status(502).json({ error: error instanceof Error ? error.message : 'AI analysis failed' })
  }
}

export default withApiHandler(handler)
