/**
 * Server-to-server conversion reporting to Meta.
 *
 * Why this exists at all rather than relying on the browser pixel: the pixel is
 * blocked by ad blockers and by iOS tracking prevention, so campaigns optimise
 * on a partial and biased sample of conversions. Sending the same events from our
 * own routes is the only way the numbers a campaign learns from resemble the
 * signups that actually happened.
 *
 * Two rules hold everywhere in this file.
 *
 * Consent first: nothing is sent unless the visitor accepted non-essential
 * tracking. A hashed email is still personal data, and it does not become less so
 * for leaving from a server rather than a browser. `hasAdConsent` fails closed.
 *
 * Never break the request: reporting is best-effort. A slow or failing advertising
 * endpoint must not delay or fail a registration, so every call is bounded by a
 * short timeout and swallows its errors after logging them.
 */
import { createHash } from 'node:crypto'
import type { NextApiRequest } from 'next'
import { CONSENT_COOKIE } from '@/lib/cookie-consent'
import { metaServerConfig } from './config'

const REQUEST_TIMEOUT_MS = 3_000

/** Meta's standard events, narrowed to the ones this product actually has. */
export type MetaEventName = 'PageView' | 'CompleteRegistration' | 'Purchase' | 'StartTrial'

export type MetaUserData = {
  /** Plain email; hashed here, never sent in the clear. */
  email?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  /** Meta's browser and click identifiers, from their cookies. */
  fbp?: string | null
  fbc?: string | null
}

export type MetaEvent = {
  eventName: MetaEventName
  /** Shared with the browser event of the same conversion so Meta deduplicates. */
  eventId: string
  eventSourceUrl?: string | null
  userData: MetaUserData
  value?: number
  currency?: string
  eventTime?: number
}

/** Meta requires SHA-256 of the trimmed, lowercased value. */
function hashed(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export function hashEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return null
  return hashed(normalized)
}

function cookieValue(req: NextApiRequest, name: string): string | null {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('=')) || null
  }
  return null
}

/**
 * Whether this request carries consent for advertising measurement.
 *
 * Fails closed: no cookie, an unreadable cookie, or anything other than an
 * explicit acceptance means no.
 */
export function hasAdConsent(req: NextApiRequest): boolean {
  return cookieValue(req, CONSENT_COOKIE) === 'accepted'
}

function clientIp(req: NextApiRequest): string | null {
  const forwarded = req.headers['x-forwarded-for']
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const first = candidate?.split(',')[0]?.trim()
  return first || req.socket?.remoteAddress || null
}

/**
 * Everything Meta can use to match an event to a person, taken from the request.
 * Match quality is what makes the difference between a conversion Meta can learn
 * from and one it discards, so IP, user agent and Meta's own cookies are included
 * where the browser sent them.
 */
export function userDataFromRequest(req: NextApiRequest, email?: string | null): MetaUserData {
  return {
    email,
    clientIpAddress: clientIp(req),
    clientUserAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    fbp: cookieValue(req, '_fbp'),
    fbc: cookieValue(req, '_fbc'),
  }
}

function serializeEvent(event: MetaEvent) {
  const emailHash = hashEmail(event.userData.email)
  return {
    event_name: event.eventName,
    event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    action_source: 'website',
    ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
    user_data: {
      ...(emailHash ? { em: [emailHash] } : {}),
      ...(event.userData.clientIpAddress ? { client_ip_address: event.userData.clientIpAddress } : {}),
      ...(event.userData.clientUserAgent ? { client_user_agent: event.userData.clientUserAgent } : {}),
      ...(event.userData.fbp ? { fbp: event.userData.fbp } : {}),
      ...(event.userData.fbc ? { fbc: event.userData.fbc } : {}),
    },
    ...(event.value !== undefined && event.currency
      ? { custom_data: { value: event.value, currency: event.currency.toUpperCase() } }
      : {}),
  }
}

/**
 * Send events to Meta. Resolves to false when reporting is not configured, not
 * consented, or the call failed — never throws, and never keeps a caller waiting
 * longer than {@link REQUEST_TIMEOUT_MS}.
 */
export async function sendMetaEvents(events: MetaEvent[]): Promise<boolean> {
  const config = metaServerConfig()
  if (!config || !events.length) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.pixelId}/events`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: events.map(serializeEvent),
          access_token: config.accessToken,
          ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
        }),
      },
    )
    if (!response.ok) {
      // The body carries Meta's reason; the token is not echoed back.
      const detail = await response.text().catch(() => '')
      console.warn('[meta] conversions API rejected events', response.status, detail.slice(0, 300))
      return false
    }
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[meta] conversions API did not respond in time')
    } else {
      console.warn('[meta] conversions API unreachable', error instanceof Error ? error.message : error)
    }
    return false
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Report a conversion if — and only if — the request consented to it.
 *
 * Deliberately takes the request rather than a boolean, so a caller cannot
 * accidentally skip the consent check by passing `true`.
 */
export async function reportConversion(req: NextApiRequest, event: MetaEvent): Promise<boolean> {
  if (!hasAdConsent(req)) return false
  return sendMetaEvents([event])
}
