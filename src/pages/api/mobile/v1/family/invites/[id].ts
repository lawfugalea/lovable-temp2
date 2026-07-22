import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | MobileApiError>) {
  if (req.method !== 'DELETE') { res.setHeader('Allow', 'DELETE'); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  if (!id || !householdId) return res.status(400).json({ error: 'Invite and household are required' })
  const membership = await prisma.membership.findUnique({ where: { userId_householdId: { userId: identity.userId, householdId } }, select: { role: true } })
  if (membership?.role !== 'OWNER') return res.status(403).json({ error: 'Owner role required' })
  const updated = await prisma.invite.updateMany({ where: { id, householdId, status: 'PENDING' }, data: { status: 'REVOKED' } })
  if (!updated.count) return res.status(404).json({ error: 'Pending invite not found' })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
