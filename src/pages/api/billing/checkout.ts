import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401, requireMembershipIn } from '@/lib/api-guards'
import { rejectDemoUser } from '@/lib/demo'
import { createRateLimit } from '@/lib/rate-limiter'
import { requireActiveHousehold } from '@/lib/chores'
import { getStripe, isBillingConfigured, priceIdFor } from '@/lib/billing/stripe'
import { appUrl } from '@/lib/links'

const checkoutRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (await rejectDemoUser(res, userId, 'Subscribing')) return
  if (!(await checkoutRateLimit(req, res))) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  const context = await requireMembershipIn(req, res, householdId, { ownerOnly: true })
  if (!context) return

  if (!isBillingConfigured()) {
    return res.status(503).json({ error: 'Billing is not configured on this deployment yet' })
  }
  const interval = req.body?.interval === 'year' ? 'year' : 'month'
  const priceId = priceIdFor(interval)
  const stripe = getStripe()
  if (!stripe || !priceId) {
    return res.status(503).json({ error: 'Billing is not configured on this deployment yet' })
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true, plan: true, planSource: true, stripeCustomerId: true, stripeSubscriptionStatus: true },
  })
  if (!household) return res.status(404).json({ error: 'Household not found' })
  if (household.plan === 'FAMILY' && household.planSource === 'STRIPE' && household.stripeSubscriptionStatus === 'active') {
    return res.status(409).json({ error: 'This household already has an active Family subscription' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })

  let customerId = household.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name || undefined,
      metadata: { householdId, householdName: household.name },
    })
    customerId = customer.id
    await prisma.household.update({ where: { id: householdId }, data: { stripeCustomerId: customerId } })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: householdId,
    subscription_data: { metadata: { householdId } },
    allow_promotion_codes: true,
    success_url: appUrl('/settings?tab=billing&checkout=success'),
    cancel_url: appUrl('/settings?tab=billing&checkout=cancelled'),
  })

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ url: session.url })
}
