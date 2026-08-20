import Stripe from 'stripe'
import { prisma } from '../prisma'
import { mapSubscriptionState } from './subscription-state'

let client: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (!client) client = new Stripe(key)
  return client
}

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
    process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim() &&
    process.env.STRIPE_PRICE_FAMILY_ANNUAL?.trim(),
  )
}

export function priceIdFor(interval: 'month' | 'year'): string | null {
  const id = interval === 'month'
    ? process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim()
    : process.env.STRIPE_PRICE_FAMILY_ANNUAL?.trim()
  return id || null
}

export function billingGraceDays(): number {
  const parsed = Number(process.env.BILLING_GRACE_DAYS)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7
}

/** Resolve the household a subscription belongs to. */
async function householdIdForSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = sub.metadata?.householdId
  if (typeof fromMetadata === 'string' && fromMetadata) return fromMetadata
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId) return null
  const household = await prisma.household.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })
  return household?.id ?? null
}

/**
 * Single writer for all subscription-driven plan changes. Re-fetches the
 * subscription from Stripe so webhook delivery order never matters.
 */
export async function syncSubscriptionToHousehold(subscriptionId: string): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const householdId = await householdIdForSubscription(sub)
  if (!householdId) {
    console.error('[billing] subscription without resolvable household', subscriptionId)
    return
  }

  const existing = await prisma.household.findUnique({
    where: { id: householdId },
    select: { graceUntil: true, planSource: true },
  })
  const state = mapSubscriptionState(sub, {
    now: new Date(),
    graceDays: billingGraceDays(),
    existingGraceUntil: existing?.graceUntil ?? null,
  })

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  await prisma.household.update({
    where: { id: householdId },
    data: {
      // An admin comp always outranks Stripe state; never downgrade it here.
      ...(existing?.planSource === 'ADMIN' && state.plan === 'FREE'
        ? {}
        : { plan: state.plan, planSource: state.plan === 'FAMILY' ? 'STRIPE' : null }),
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: state.keepSubscriptionRef ? sub.id : null,
      stripeSubscriptionStatus: state.keepSubscriptionRef ? sub.status : null,
      stripePriceId: state.keepSubscriptionRef ? (sub.items.data[0]?.price?.id ?? null) : null,
      currentPeriodEnd: state.currentPeriodEnd,
      graceUntil: state.graceUntil,
    },
  })
}
