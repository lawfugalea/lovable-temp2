/**
 * Pure mapping from a RevenueCat webhook event to ClanKeep plan state.
 *
 * Deliberately mirrors `subscription-state.ts` (Stripe): the same two questions
 * — is this household entitled, and until when — answered from a different
 * provider's vocabulary. Keeping it pure is what makes the money-critical part
 * testable without Apple, RevenueCat, or a database.
 */

export interface AppleEvent {
  /** RevenueCat event type, e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION. */
  type: string
  /** Our own User.id — the app user id we called Purchases.logIn with. */
  appUserId: string
  /** Apple's stable id for the subscription across renewals. */
  originalTransactionId: string | null
  productId: string | null
  /** Milliseconds since epoch, as RevenueCat sends them. */
  expirationAtMs?: number | null
  /** Present on refunds and some cancellations. */
  isRefund?: boolean
}

export interface MappedAppleState {
  plan: 'FREE' | 'FAMILY'
  /** Whether to keep the stored Apple identifiers after applying this event. */
  keepSubscriptionRef: boolean
  status: string
  expiresAt: Date | null
  graceUntil: Date | null
}

/**
 * Events that mean "entitled right now".
 *
 * CANCELLATION is deliberately here: in Apple's model a cancellation stops the
 * *renewal*, it does not revoke the period already paid for. Treating it as an
 * immediate downgrade would take away access somebody has paid for, so the
 * expiry date is what ends entitlement, not the cancellation event.
 */
const ENTITLING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'CANCELLATION',
  'SUBSCRIPTION_EXTENDED',
])

/** Events that end entitlement the moment they arrive. */
const REVOKING = new Set(['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED'])

/** Apple could not take payment; access continues for a bounded window. */
const BILLING_ISSUE = 'BILLING_ISSUE'

export function mapAppleSubscriptionState(
  event: AppleEvent,
  opts: { now: Date; graceDays: number; existingGraceUntil: Date | null },
): MappedAppleState {
  const expiresAt = event.expirationAtMs ? new Date(event.expirationAtMs) : null
  const status = event.type

  // A refund is a reversal, whatever event carried it.
  if (event.isRefund || event.type === 'REFUND') {
    return { plan: 'FREE', keepSubscriptionRef: false, status: 'REFUNDED', expiresAt: null, graceUntil: null }
  }

  if (event.type === BILLING_ISSUE) {
    // Set the window once, so retried or duplicated events cannot keep
    // extending free access indefinitely.
    const graceUntil = opts.existingGraceUntil
      ?? new Date(opts.now.getTime() + opts.graceDays * 24 * 3600 * 1000)
    return { plan: 'FAMILY', keepSubscriptionRef: true, status, expiresAt, graceUntil }
  }

  if (REVOKING.has(event.type)) {
    return { plan: 'FREE', keepSubscriptionRef: event.type !== 'REFUND', status, expiresAt, graceUntil: null }
  }

  if (ENTITLING.has(event.type)) {
    // An entitling event whose period has already elapsed grants nothing. This
    // matters for replayed webhooks: a late RENEWAL for a period that has since
    // ended must not resurrect access.
    if (expiresAt && expiresAt.getTime() <= opts.now.getTime()) {
      return { plan: 'FREE', keepSubscriptionRef: true, status: 'EXPIRED', expiresAt, graceUntil: null }
    }
    return { plan: 'FAMILY', keepSubscriptionRef: true, status, expiresAt, graceUntil: null }
  }

  // Unknown event type: be conservative. Keep the reference so support can see
  // what happened, but do not grant anything on a message we do not understand.
  return { plan: 'FREE', keepSubscriptionRef: true, status, expiresAt, graceUntil: null }
}

/**
 * Whether stored Apple state still entitles a household, independent of any
 * event. Used by the entitlement check, which must not trust `plan` alone —
 * a subscription that simply ran out sends no event at the moment it lapses.
 */
export function appleEntitlementActive(
  input: { status: string | null; expiresAt: Date | null; graceUntil: Date | null },
  now: Date,
): boolean {
  if (input.status === 'REFUNDED') return false
  if (input.graceUntil && input.graceUntil.getTime() > now.getTime()) return true
  if (!input.expiresAt) return false
  return input.expiresAt.getTime() > now.getTime()
}
