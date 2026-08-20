import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from './prisma'
import { requireMembershipIn } from './api-guards'
import {
  featureAllowed,
  resolveEntitlements,
  respondUpgradeRequired,
  type EntitlementFeature,
  type HouseholdEntitlements,
  type PlanKey,
} from './entitlements-core'

export * from './entitlements-core'

export async function getHouseholdEntitlements(householdId: string): Promise<HouseholdEntitlements> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: {
      plan: true,
      planSource: true,
      stripeSubscriptionStatus: true,
      appleSubscriptionStatus: true,
      appleExpiresAt: true,
      currentPeriodEnd: true,
      graceUntil: true,
      country: true,
      owner: { select: { isDemo: true } },
    },
  })
  if (!household) {
    return resolveEntitlements({
      plan: 'FREE', planSource: null, stripeSubscriptionStatus: null,
      currentPeriodEnd: null, graceUntil: null, ownerIsDemo: false,
    })
  }
  return resolveEntitlements({
    plan: household.plan,
    planSource: household.planSource,
    stripeSubscriptionStatus: household.stripeSubscriptionStatus,
    appleSubscriptionStatus: household.appleSubscriptionStatus,
    appleExpiresAt: household.appleExpiresAt,
    currentPeriodEnd: household.currentPeriodEnd,
    graceUntil: household.graceUntil,
    ownerIsDemo: household.owner?.isDemo === true,
    country: household.country,
  })
}

export async function getHouseholdPlan(householdId: string): Promise<PlanKey> {
  return (await getHouseholdEntitlements(householdId)).plan
}

/**
 * Membership + plan-feature guard. Sends the response and returns null when
 * the caller is not a member or the household's plan lacks the feature.
 */
export async function requireHouseholdFeature(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  feature: EntitlementFeature,
  opts: { ownerOnly?: boolean } = {},
): Promise<{ userId: string; entitlements: HouseholdEntitlements } | null> {
  const context = await requireMembershipIn(req, res, householdId, { ownerOnly: opts.ownerOnly === true })
  if (!context) return null
  const entitlements = await getHouseholdEntitlements(householdId!)
  if (!featureAllowed(entitlements, feature)) {
    respondUpgradeRequired(res, feature)
    return null
  }
  return { userId: context.userId, entitlements }
}
