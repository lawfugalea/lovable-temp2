import type { NextApiResponse } from 'next'

export type PlanKey = 'FREE' | 'FAMILY'
export type PlanSourceKey = 'STRIPE' | 'ADMIN' | null
export type EntitlementFeature = 'finance' | 'ai' | 'pushReminders' | 'medicinePdf' | 'children'

export const FREE_CHILD_LIMIT = 1

/** Stripe statuses that mean the subscription is in good standing. */
const GOOD_STANDING = new Set(['active', 'trialing'])

export interface HouseholdEntitlements {
  plan: PlanKey
  effectiveVia: 'free' | 'stripe' | 'admin' | 'demo' | 'grace'
  canUseFinance: boolean
  canUseAi: boolean
  maxChildren: number
  canUsePushReminders: boolean
  canExportMedicinePdf: boolean
  currentPeriodEnd: Date | null
  graceUntil: Date | null
}

export interface EntitlementInput {
  plan: PlanKey
  planSource: PlanSourceKey
  stripeSubscriptionStatus: string | null
  currentPeriodEnd: Date | null
  graceUntil: Date | null
  ownerIsDemo: boolean
  now?: Date
}

const UPGRADE_COPY: Record<EntitlementFeature, string> = {
  finance: 'Finances are part of the Family plan',
  ai: 'AI spending insights are part of the Family plan',
  pushReminders: 'Medicine push reminders are part of the Family plan',
  medicinePdf: 'PDF health reports are part of the Family plan',
  children: 'The free plan tracks medicines for one child — upgrade to add more',
}

/** Pure entitlement resolution — the single place plan semantics live. */
export function resolveEntitlements(input: EntitlementInput): HouseholdEntitlements {
  const now = input.now ?? new Date()

  let effectiveVia: HouseholdEntitlements['effectiveVia'] = 'free'
  if (input.ownerIsDemo) {
    effectiveVia = 'demo'
  } else if (input.plan === 'FAMILY' && input.planSource === 'ADMIN') {
    effectiveVia = 'admin'
  } else if (
    input.plan === 'FAMILY' &&
    input.stripeSubscriptionStatus !== null &&
    GOOD_STANDING.has(input.stripeSubscriptionStatus)
  ) {
    effectiveVia = 'stripe'
  } else if (input.plan === 'FAMILY' && input.graceUntil !== null && input.graceUntil.getTime() > now.getTime()) {
    effectiveVia = 'grace'
  }

  const isFamily = effectiveVia !== 'free'
  return {
    plan: isFamily ? 'FAMILY' : 'FREE',
    effectiveVia,
    canUseFinance: isFamily,
    canUseAi: isFamily,
    maxChildren: isFamily ? Number.POSITIVE_INFINITY : FREE_CHILD_LIMIT,
    canUsePushReminders: isFamily,
    canExportMedicinePdf: isFamily,
    currentPeriodEnd: input.currentPeriodEnd,
    graceUntil: input.graceUntil,
  }
}

export function featureAllowed(entitlements: HouseholdEntitlements, feature: EntitlementFeature): boolean {
  switch (feature) {
    case 'finance': return entitlements.canUseFinance
    case 'ai': return entitlements.canUseAi
    case 'pushReminders': return entitlements.canUsePushReminders
    case 'medicinePdf': return entitlements.canExportMedicinePdf
    case 'children': return entitlements.maxChildren === Number.POSITIVE_INFINITY
  }
}


/** Respond with the paywall 403 shape the UI recognises. */
export function respondUpgradeRequired(res: NextApiResponse, feature: EntitlementFeature): void {
  res.status(403).json({ error: UPGRADE_COPY[feature], code: 'upgrade_required', feature })
}
