import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { isBillingConfigured } from '@/lib/billing/stripe'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return

  const [entitlements, membership, household] = await Promise.all([
    getHouseholdEntitlements(householdId),
    prisma.membership.findUnique({
      where: { userId_householdId: { userId, householdId } },
      select: { role: true },
    }),
    prisma.household.findUnique({
      where: { id: householdId },
      select: { stripeSubscriptionStatus: true, stripeCustomerId: true },
    }),
  ])

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    plan: entitlements.plan,
    effectiveVia: entitlements.effectiveVia,
    isOwner: membership?.role === 'OWNER',
    currentPeriodEnd: entitlements.currentPeriodEnd,
    graceUntil: entitlements.graceUntil,
    status: household?.stripeSubscriptionStatus ?? null,
    hasBillingAccount: Boolean(household?.stripeCustomerId),
    billingConfigured: isBillingConfigured(),
    prices: { monthly: '€4.99', annual: '€49' },
  })
}
