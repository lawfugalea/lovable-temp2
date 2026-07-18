import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401, requireMembershipIn } from '@/lib/api-guards'
import { rejectDemoUser } from '@/lib/demo'
import { requireActiveHousehold } from '@/lib/chores'
import { getStripe } from '@/lib/billing/stripe'
import { appUrl } from '@/lib/links'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (await rejectDemoUser(res, userId, 'Managing billing')) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  const context = await requireMembershipIn(req, res, householdId, { ownerOnly: true })
  if (!context) return

  const stripe = getStripe()
  if (!stripe) return res.status(503).json({ error: 'Billing is not configured on this deployment yet' })

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { stripeCustomerId: true },
  })
  if (!household?.stripeCustomerId) {
    return res.status(400).json({ error: 'This household has no billing account yet' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: household.stripeCustomerId,
    return_url: appUrl('/settings?tab=billing'),
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ url: session.url })
}
