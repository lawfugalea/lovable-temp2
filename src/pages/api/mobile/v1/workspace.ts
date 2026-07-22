import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileWorkspaceResponse, MobileWorkspaceUpdateResponse } from '../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { rejectDemoUser } from '@/lib/demo'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileWorkspaceResponse | MobileWorkspaceUpdateResponse | MobileApiError

async function workspace(userId: string, householdId: string): Promise<MobileWorkspaceResponse | null> {
  const [membership, user, members, children, invites] = await Promise.all([
    prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId } }, select: { role: true, household: { select: { id: true, name: true, country: true } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    prisma.membership.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' }, select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } } }),
    prisma.child.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, dateOfBirth: true, isActive: true } }),
    prisma.invite.findMany({ where: { householdId, status: 'PENDING', expiresAt: { gt: new Date() } }, orderBy: { expiresAt: 'asc' }, select: { id: true, email: true, role: true, expiresAt: true } }),
  ])
  if (!membership || !user) return null
  return { household: { ...membership.household, role: membership.role }, profile: { id: user.id, name: user.name || user.email, email: user.email }, members: members.map(row => ({ id: row.user.id, membershipId: row.id, name: row.user.name || row.user.email, email: row.user.email, role: row.role, isCurrentUser: row.user.id === userId })), children: children.map(child => ({ ...child, dateOfBirth: child.dateOfBirth.toISOString() })), invites: membership.role === 'OWNER' ? invites.map(invite => ({ ...invite, expiresAt: invite.expiresAt.toISOString() })) : [] }
}

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'PATCH') { res.setHeader('Allow', ['GET', 'PATCH']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const householdId = req.method === 'GET' ? (typeof req.query.householdId === 'string' ? req.query.householdId : '') : (typeof req.body?.householdId === 'string' ? req.body.householdId : '')
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'PATCH') {
    if (await rejectDemoUser(res, identity.userId, 'Editing the workspace')) return
    if (req.body?.action === 'profile') {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      if (name.length < 2 || name.length > 50) return res.status(400).json({ error: 'Name must be between 2 and 50 characters' })
      await prisma.user.update({ where: { id: identity.userId }, data: { name } })
    } else if (req.body?.action === 'household') {
      const member = await prisma.membership.findUnique({ where: { userId_householdId: { userId: identity.userId, householdId } }, select: { role: true } })
      if (member?.role !== 'OWNER') return res.status(403).json({ error: 'Owner role required' })
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : ''
      if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Household name must be between 2 and 100 characters' })
      await prisma.household.update({ where: { id: householdId }, data: { name } })
    } else return res.status(400).json({ error: 'Unknown workspace action' })
  }
  const result = await workspace(identity.userId, householdId)
  if (!result) return res.status(404).json({ error: 'Workspace not found' })
  return res.status(200).json(req.method === 'PATCH' ? { workspace: result } : result)
}

export default withApiHandler(handler)
