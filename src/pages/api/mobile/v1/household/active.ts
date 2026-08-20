import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' })
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId: identity.userId, householdId } },
    select: { id: true },
  })
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member' })
  await prisma.user.update({ where: { id: identity.userId }, data: { activeHouseholdId: householdId } })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true, householdId })
}

export default withApiHandler(handler)
