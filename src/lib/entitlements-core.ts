import type { NextApiResponse } from 'next'
import { appleEntitlementActive } from './billing/apple-subscription-state'
import { isSupermarketComparisonAvailable } from './supermarket-consent'

export type PlanKey = 'FREE' | 'FAMILY'
export type PlanSourceKey = 'STRIPE' | 'ADMIN' | 'APPLE' | null
export type EntitlementFeature = 'finance' | 'ai' | 'pushReminders' | 'medicinePdf' | 'children' | 'priceComparison'

export const FREE_CHILD_LIMIT = 1

/** Countries whose supermarket catalogues we scrape — price comparison only makes sense here. */
const PRICE_COMPARISON_COUNTRIES = new Set(['MT'])

export function isPriceComparisonRegion(country: string): boolean {
  return PRICE_COMPARISON_COUNTRIES.has(country.toUpperCase())
}

/** Stripe statuses that mean the subscription is in good standing. */
const GOOD_STANDING = new Set(['active', 'trialing'])

export interface HouseholdEntitlements {
  plan: PlanKey
  effectiveVia: 'free' | 'stripe' | 'apple' | 'admin' | 'demo' | 'grace'
  canUseFinance: boolean
  canUseAi: boolean
  canUsePriceComparison: boolean
  /** False when the household's country has no scraped supermarket catalogues. */
  priceComparisonRegionSupported: boolean
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
  /** Apple subscription bought in the iOS app, brokered by RevenueCat. */
  appleSubscriptionStatus?: string | null
  appleExpiresAt?: Date | null
  currentPeriodEnd: Date | null
  graceUntil: Date | null
  ownerIsDemo: boolean
  /** ISO 3166-1 alpha-2. Households without a stored country are treated as Maltese. */
  country?: string
  now?: Date
}

const UPGRADE_COPY: Record<EntitlementFeature, string> = {
  finance: 'Finances are part of the Family plan',
  ai: 'AI features are part of the Family plan',
  pushReminders: 'Push reminders are part of the Family plan',
  medicinePdf: 'PDF health reports are part of the Family plan',
  children: 'The free plan tracks medicines for one child — upgrade to add more',
  priceComparison: 'Supermarket price comparison is part of the Family plan',
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
  } else if (
    input.plan === 'FAMILY' &&
    // Checked against the stored dates rather than the plan alone: Apple sends
    // no event at the instant a subscription lapses, so a household left on
    // FAMILY would otherwise keep access after its paid period ended.
    appleEntitlementActive(
      {
        status: input.appleSubscriptionStatus ?? null,
        expiresAt: input.appleExpiresAt ?? null,
        graceUntil: input.graceUntil,
      },
      now,
    )
  ) {
    effectiveVia = 'apple'
  } else if (input.plan === 'FAMILY' && input.graceUntil !== null && input.graceUntil.getTime() > now.getTime()) {
    effectiveVia = 'grace'
  }

  const isFamily = effectiveVia !== 'free'
  const priceComparisonRegionSupported = isPriceComparisonRegion(input.country ?? 'MT')
  return {
    plan: isFamily ? 'FAMILY' : 'FREE',
    effectiveVia,
    canUseFinance: isFamily,
    canUseAi: isFamily,
    canUsePriceComparison: isFamily && priceComparisonRegionSupported,
    priceComparisonRegionSupported,
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
    case 'priceComparison': return entitlements.canUsePriceComparison
  }
}


/**
 * The paywall 403 body the UI recognises. Exposed separately from the responder
 * so bearer-token (mobile) paths, which decide the status themselves, send the
 * identical shape rather than a second copy that can drift.
 */
export function upgradeRequiredBody(feature: EntitlementFeature) {
  return { error: UPGRADE_COPY[feature], code: 'upgrade_required', feature }
}

/** Respond with the paywall 403 shape the UI recognises. */
export function respondUpgradeRequired(res: NextApiResponse, feature: EntitlementFeature): void {
  res.status(403).json(upgradeRequiredBody(feature))
}

/** Respond with the region 403 shape the UI recognises — not a paywall, the feature simply doesn't exist here. */
export function respondRegionUnavailable(res: NextApiResponse, feature: EntitlementFeature): void {
  res.status(403).json({
    error: 'Supermarket price comparison covers Maltese supermarkets only',
    code: 'unavailable_region',
    feature,
  })
}

/** The catalogue feature remains parked until at least one retailer has consented. */
export function respondPriceComparisonUnavailable(res: NextApiResponse): void {
  res.status(503).json({
    error: 'Supermarket price features are not currently available',
    code: 'feature_unavailable',
    feature: 'priceComparison',
  })
}

/**
 * Single gate for the price-comparison routes: sends the right 403
 * (region vs paywall) and returns false when the feature is unavailable.
 */
export function requirePriceComparison(res: NextApiResponse, entitlements: HouseholdEntitlements): boolean {
  if (!isSupermarketComparisonAvailable()) {
    respondPriceComparisonUnavailable(res)
    return false
  }
  if (!entitlements.priceComparisonRegionSupported) {
    respondRegionUnavailable(res, 'priceComparison')
    return false
  }
  if (!entitlements.canUsePriceComparison) {
    respondUpgradeRequired(res, 'priceComparison')
    return false
  }
  return true
}
