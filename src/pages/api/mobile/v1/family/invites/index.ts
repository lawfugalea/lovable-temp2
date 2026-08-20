import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileCreateInviteRequest, MobileCreateInviteResponse, MobileWorkspaceInvite } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { rejectDemoUser } from '@/lib/demo'
import { createInviteToken, hashInviteToken } from '@/lib/invite-tokens'
import { appUrl } from '@/lib/links'
import { sendInviteEmail } from '@/lib/mailer'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'
import { consumeInviteEmailAttempt } from '@/lib/rate-limit-store'

async function requireOwner(userId: string, householdId: string) {
  return prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId } }, select: { role: true } })
}

async function handler(req: NextApiRequest, res: NextApiResponse<{ invites: MobileWorkspaceInvite[] } | MobileCreateInviteResponse | MobileApiError>) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileCreateInviteRequest>
  const householdId = req.method === 'GET' ? (typeof req.query.householdId === 'string' ? req.query.householdId : '') : body.householdId || ''
  const membership = householdId ? await requireOwner(identity.userId, householdId) : null
  if (membership?.role !== 'OWNER') return res.status(403).json({ error: 'Owner role required' })
  res.setHeader('Cache-Control', 'private, no-store')
  const now = new Date()
  await prisma.invite.updateMany({ where: { householdId, status: 'PENDING', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } })
  if (req.method === 'GET') {
    const invites = await prisma.invite.findMany({ where: { householdId, status: 'PENDING', expiresAt: { gt: now } }, orderBy: { expiresAt: 'asc' }, select: { id: true, email: true, role: true, expiresAt: true } })
    return res.status(200).json({ invites: invites.map(invite => ({ ...invite, expiresAt: invite.expiresAt.toISOString() })) })
  }
  if (await rejectDemoUser(res, identity.userId, 'Inviting people')) return
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body.role
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  if (role !== 'OWNER' && role !== 'MEMBER') return res.status(400).json({ error: 'Select a valid role' })
  if (!(await consumeInviteEmailAttempt(identity.userId))) { res.setHeader('Retry-After', '3600'); return res.status(429).json({ error: 'Too many invitation emails. Try again later.' }) }

  const rawToken = createInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  try {
    const invite = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId} FOR UPDATE`
      const [owner, member, pending] = await Promise.all([
        tx.membership.findUnique({ where: { userId_householdId: { userId: identity.userId, householdId } }, select: { role: true } }),
        tx.membership.findFirst({ where: { householdId, user: { email: { equals: email, mode: 'insensitive' } } }, select: { id: true } }),
        tx.invite.findFirst({ where: { householdId, email, status: 'PENDING', expiresAt: { gt: new Date() } }, select: { id: true } }),
      ])
      if (owner?.role !== 'OWNER') throw Object.assign(new Error('Owner role required'), { status: 403 })
      if (member) throw Object.assign(new Error('This person is already a member'), { status: 409 })
      if (pending) throw Object.assign(new Error('A pending invite already exists'), { status: 409 })
      return tx.invite.create({ data: { householdId, email, role, tokenHash: hashInviteToken(rawToken), status: 'PENDING', expiresAt, invitedById: identity.userId }, select: { id: true, email: true, role: true, expiresAt: true } })
    })
    const [household, inviter] = await Promise.all([
      prisma.household.findUnique({ where: { id: householdId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: identity.userId }, select: { name: true, email: true } }),
    ])
    const sent = await sendInviteEmail({ to: email, acceptUrl: appUrl(`/invites/accept?token=${encodeURIComponent(rawToken)}`), inviterName: inviter?.name || inviter?.email || 'A Clankeep user', householdName: household?.name || 'your household' })
    return res.status(201).json({ invite: { ...invite, expiresAt: invite.expiresAt.toISOString() }, emailSent: sent.ok })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 500
    return res.status(status).json({ error: status === 500 ? 'Could not create invite' : (error as Error).message })
  }
}

export default withApiHandler(handler)
