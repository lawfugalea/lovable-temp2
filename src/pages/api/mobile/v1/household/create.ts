import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileCreateHouseholdRequest, MobileCreateHouseholdResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

const COUNTRY_RE = /^[A-Z]{2}$/

async function handler(req: NextApiRequest, res: NextApiResponse<MobileCreateHouseholdResponse | MobileApiError>) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileCreateHouseholdRequest>
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : 'MT'
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Household name must be between 2 and 100 characters' })
  if (!COUNTRY_RE.test(country)) return res.status(400).json({ error: 'Country must be a two-letter ISO code' })

  try {
    const household = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identity.userId} FOR UPDATE`
      const existing = await tx.membership.findFirst({ where: { userId: identity.userId }, select: { householdId: true } })
      if (existing) throw Object.assign(new Error('You already belong to a household'), { status: 409 })
      const created = await tx.household.create({ data: { name, country, ownerId: identity.userId }, select: { id: true, name: true } })
      await tx.membership.create({ data: { userId: identity.userId, householdId: created.id, role: 'OWNER' } })
      await tx.user.update({ where: { id: identity.userId }, data: { activeHouseholdId: created.id } })
      return created
    })
    return res.status(201).json({ householdId: household.id, name: household.name })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 500
    return res.status(status).json({ error: status === 500 ? 'Could not create household' : (error as Error).message })
  }
}

export default withApiHandler(handler)
