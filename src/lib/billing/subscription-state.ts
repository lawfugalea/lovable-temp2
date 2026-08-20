/** Pure mapping from a Stripe subscription snapshot to ClanKeep plan state. */

export interface SubscriptionSnapshot {
  status: string
  /** Unix seconds; Stripe's items.data[0].current_period_end (or legacy top-level). */
  currentPeriodEnd?: number | null
}

export interface MappedSubscriptionState {
  plan: 'FREE' | 'FAMILY'
  keepSubscriptionRef: boolean
  currentPeriodEnd: Date | null
  graceUntil: Date | null
}

const GOOD_STANDING = new Set(['active', 'trialing'])
const LAPSED = new Set(['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused'])

interface SubscriptionLike {
  status: string
  items?: { data?: Array<{ current_period_end?: number | null }> }
  /** Older API versions expose this at the top level. */
  current_period_end?: number | null
}

export function mapSubscriptionState(
  sub: SubscriptionLike,
  opts: { now: Date; graceDays: number; existingGraceUntil: Date | null },
): MappedSubscriptionState {
  const periodEndSeconds = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end ?? null
  const currentPeriodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : null

  if (GOOD_STANDING.has(sub.status)) {
    return { plan: 'FAMILY', keepSubscriptionRef: true, currentPeriodEnd, graceUntil: null }
  }
  if (sub.status === 'past_due') {
    // Keep access during a bounded grace window; set it once so retries
    // cannot keep extending it.
    const graceUntil = opts.existingGraceUntil
      ?? new Date(opts.now.getTime() + opts.graceDays * 24 * 3600 * 1000)
    return { plan: 'FAMILY', keepSubscriptionRef: true, currentPeriodEnd, graceUntil }
  }
  if (LAPSED.has(sub.status)) {
    return { plan: 'FREE', keepSubscriptionRef: false, currentPeriodEnd: null, graceUntil: null }
  }
  // Unknown status: be conservative, keep the reference but drop to free.
  return { plan: 'FREE', keepSubscriptionRef: true, currentPeriodEnd, graceUntil: null }
}
