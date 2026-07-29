/**
 * Meta's browser pixel, loaded only after the visitor accepts non-essential
 * tracking.
 *
 * Meta's documented snippet is an inline `<script>` that builds the `fbq` queue
 * before loading their library. This app's CSP allows no inline script beyond one
 * hashed theme snippet, and `scripts/check-csp-theme-hash.mjs` fails the deploy if
 * an unallowed one appears — so the library is loaded as a plain `src` script and
 * `fbq` is called after it arrives. Nothing inline, nothing new to hash.
 *
 * Consent is checked on every render rather than once: `useCookieConsent` tracks
 * the banner and other tabs, so withdrawing consent unmounts this and stops
 * further events.
 */
import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useCookieConsent } from '@/lib/cookie-consent'
import { metaPixelId } from '@/lib/meta/config'

type Fbq = ((...args: unknown[]) => void) & { loaded?: boolean }

declare global {
  interface Window {
    fbq?: Fbq
  }
}

/**
 * Report a conversion from the browser.
 *
 * `eventId` must match the id sent for the same conversion by the server, or Meta
 * counts one signup twice.
 */
export function trackMetaEvent(name: string, eventId: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', name, params ?? {}, { eventID: eventId })
}

export default function MetaPixel() {
  const { consent } = useCookieConsent()
  const router = useRouter()
  const initialized = useRef(false)
  const enabled = Boolean(metaPixelId) && consent === 'accepted'

  useEffect(() => {
    if (!enabled) return
    // Views after the first are client-side navigations, which the pixel cannot
    // see for itself.
    const onRouteChange = () => {
      if (initialized.current) window.fbq?.('track', 'PageView')
    }
    router.events.on('routeChangeComplete', onRouteChange)
    return () => router.events.off('routeChangeComplete', onRouteChange)
  }, [enabled, router.events])

  if (!enabled) return null

  return (
    <Script
      id="meta-pixel"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (initialized.current || typeof window.fbq !== 'function') return
        window.fbq('init', metaPixelId)
        window.fbq('track', 'PageView')
        initialized.current = true
      }}
    />
  )
}
