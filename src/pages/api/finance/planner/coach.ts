import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { loadPlannerData } from '@/lib/finance/planner-data'
import { buildRedactedPlannerPayload, requestDeepSeekPlannerAnalysis } from '@/lib/finance/planner-coach'
import { createRateLimit } from '@/lib/rate-limiter'

const plannerCoachRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20 })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  if (!isDeepSeekConfigured()) {
    return res.status(503).json({ error: 'AI analysis is not configured on this deployment' })
  }
  if (!(await plannerCoachRateLimit(req, res))) return

  const data = await loadPlannerData(access.householdId)
  if (!data.incomes.length && !data.commitments.length) {
    return res.status(400).json({ error: 'Add income and commitments before requesting a savings plan' })
  }
  const payload = buildRedactedPlannerPayload(data)

  const preference = await prisma.financeAiPreference.findUnique({ where: { userId: access.userId } })
  const consented = Boolean(preference?.consentedAt) && !preference?.revokedAt
  if (!consented && req.body?.consent !== true) {
    // First run: show exactly what would be sent before anything leaves the server.
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ requiresConsent: true, preview: payload })
  }
  if (!consented) {
    await prisma.financeAiPreference.upsert({
      where: { userId: access.userId },
      create: { userId: access.userId, consentedAt: new Date(), revokedAt: null },
      update: { consentedAt: new Date(), revokedAt: null },
    })
  }

  try {
    const result = await requestDeepSeekPlannerAnalysis(payload)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ ...result, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Planner coach analysis failed:', error)
    return res.status(502).json({ error: error instanceof Error ? error.message : 'AI analysis failed' })
  }
}

export default withApiHandler(handler)
