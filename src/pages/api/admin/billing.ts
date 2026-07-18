import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/admin-helpers';
import { prisma } from '@/lib/prisma';

/** Admin plan override: comp a household onto Family, or revoke a comp. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : '';
  const plan = req.body?.plan;
  if (!householdId || (plan !== 'FREE' && plan !== 'FAMILY')) {
    return res.status(400).json({ error: 'householdId and plan (FREE or FAMILY) are required' });
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { plan: true, planSource: true, stripeSubscriptionStatus: true },
  });
  if (!household) return res.status(404).json({ error: 'Household not found' });

  if (
    plan === 'FREE' &&
    household.planSource === 'STRIPE' &&
    household.stripeSubscriptionStatus &&
    ['active', 'trialing', 'past_due'].includes(household.stripeSubscriptionStatus)
  ) {
    return res.status(409).json({
      error: 'This household has a live Stripe subscription — cancel it in Stripe instead of overriding the plan',
    });
  }

  const updated = await prisma.household.update({
    where: { id: householdId },
    data: plan === 'FAMILY'
      ? { plan: 'FAMILY', planSource: 'ADMIN' }
      : { plan: 'FREE', planSource: null, graceUntil: null },
    select: { id: true, plan: true, planSource: true },
  });
  return res.status(200).json({ household: updated });
}
