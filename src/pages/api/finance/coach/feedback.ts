import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const signalKey = typeof req.body?.signalKey === 'string' ? req.body.signalKey.slice(0, 64) : ''
  const state = req.body?.state === 'SNOOZED' ? 'SNOOZED' : req.body?.state === 'DISMISSED' ? 'DISMISSED' : null
  if (!signalKey || !state) return res.status(400).json({ error: 'Signal and feedback state are required' })
  const snoozedUntil = state === 'SNOOZED'
    ? new Date(Date.now() + Math.max(1, Math.min(365, Number(req.body?.days || 30))) * 86_400_000)
    : null
  const feedback = await prisma.financeCoachFeedback.upsert({
    where: { userId_signalKey: { userId: access.userId, signalKey } },
    create: { userId: access.userId, signalKey, state, snoozedUntil },
    update: { state, snoozedUntil },
  })
  return res.status(200).json({ feedback })
}
