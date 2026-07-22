import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { detachUserFromHouseholds } from '@/lib/household-membership'
import { reconcileActiveHousehold } from '@/lib/households'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | MobileApiError>) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') { res.setHeader('Allow', ['PATCH', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  const role = req.body?.role
  if (!id || !householdId) return res.status(400).json({ error: 'Member and household are required' })
  if (req.method === 'PATCH' && role !== 'OWNER' && role !== 'MEMBER') return res.status(400).json({ error: 'Select a valid role' })
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId} FOR UPDATE`
      const [actor, target] = await Promise.all([
        tx.membership.findUnique({ where: { userId_householdId: { userId: identity.userId, householdId } }, select: { role: true } }),
        tx.membership.findFirst({ where: { id, householdId }, select: { id: true, userId: true, role: true } }),
      ])
      if (actor?.role !== 'OWNER') throw Object.assign(new Error('Owner role required'), { status: 403 })
      if (!target) throw Object.assign(new Error('Member not found'), { status: 404 })
      if (target.userId === identity.userId) throw Object.assign(new Error('Use the web ownership flow to change your own membership'), { status: 400 })
      if (req.method === 'DELETE') {
        if (target.role === 'OWNER') throw Object.assign(new Error('Demote this owner before removing them'), { status: 409 })
        await detachUserFromHouseholds(tx, target.userId, [householdId])
        await reconcileActiveHousehold(target.userId, { write: true, db: tx })
      } else {
        await tx.membership.update({ where: { id }, data: { role } })
        if (role === 'OWNER') await tx.household.updateMany({ where: { id: householdId, ownerId: null }, data: { ownerId: target.userId } })
      }
    })
    return res.status(200).json({ ok: true })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 500
    return res.status(status).json({ error: status === 500 ? 'Could not update member' : (error as Error).message })
  }
}

export default withApiHandler(handler)
