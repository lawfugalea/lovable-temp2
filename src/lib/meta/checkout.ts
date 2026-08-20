/**
 * Carrying measurement context through a Stripe Checkout session.
 *
 * A subscription is confirmed by a webhook from Stripe, which arrives with no
 * browser attached: no consent cookie, no Meta cookies, no user agent. The
 * alternative to this would be persisting an advertising-consent flag on the user
 * — a schema change, and a worse answer, because the flag would record what the
 * person had consented to at some other time rather than at the moment they chose
 * to subscribe.
 *
 * So the relevant context rides along in the session's metadata and comes back
 * with the completion event.
 */
import type { NextApiRequest } from 'next'
import { hasAdConsent, userDataFromRequest } from './conversions'
import { newEventId } from './event-id'

/** Stripe metadata values are strings, and there are only so many slots. */
export type CheckoutMeasurementMetadata = {
  adConsent: string
  metaEventId: string
  fbp?: string
  fbc?: string
}

export function checkoutMeasurementMetadata(req: NextApiRequest): CheckoutMeasurementMetadata {
  const consented = hasAdConsent(req)
  const userData = userDataFromRequest(req)
  return {
    adConsent: consented ? 'accepted' : 'declined',
    metaEventId: newEventId(),
    // Only worth carrying when consent was given; without it they are never read.
    ...(consented && userData.fbp ? { fbp: userData.fbp } : {}),
    ...(consented && userData.fbc ? { fbc: userData.fbc } : {}),
  }
}

export type CheckoutMeasurement = {
  consented: boolean
  eventId: string
  fbp: string | null
  fbc: string | null
}

/** Read back what {@link checkoutMeasurementMetadata} stored. Fails closed. */
export function readCheckoutMeasurement(
  metadata: Record<string, string | null | undefined> | null | undefined,
): CheckoutMeasurement {
  return {
    consented: metadata?.adConsent === 'accepted',
    eventId: metadata?.metaEventId || newEventId(),
    fbp: metadata?.fbp || null,
    fbc: metadata?.fbc || null,
  }
}
