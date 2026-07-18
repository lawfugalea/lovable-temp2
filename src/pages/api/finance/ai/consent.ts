import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  await prisma.$transaction([
    prisma.financeAiPreference.upsert({
      where: { userId: access.userId },
      create: { userId: access.userId, revokedAt: new Date(), consentedAt: null },
      update: { revokedAt: new Date(), consentedAt: null },
    }),
    prisma.financeAiAnalysis.deleteMany({ where: { userId: access.userId } }),
  ])
  return res.status(200).json({ ok: true })
}
