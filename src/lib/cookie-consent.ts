import { useEffect, useState } from 'react'

/**
 * Consent for NON-essential cookies/third-party scripts (currently the Kelma
 * chat widget). Essential session/security cookies never depend on this.
 */
export type CookieConsent = 'accepted' | 'declined'

const STORAGE_KEY = 'clankeep-cookie-consent'
const EVENT = 'clankeep-cookie-consent-change'

/**
 * The same decision, mirrored into a cookie.
 *
 * localStorage is invisible to the server, and measurement events sent from our
 * own API routes have to be gated on the visitor's consent just as the browser
 * scripts are — sending a hashed email to an advertising platform is processing
 * personal data whichever side of the wire it leaves from. This cookie is how a
 * request carries that decision. It is deliberately readable by script (the
 * client writes it) and holds nothing but the word "accepted" or "declined".
 */
export const CONSENT_COOKIE = 'clankeep-consent'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

function writeConsentCookie(value: CookieConsent): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function writeConsent(value: CookieConsent): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }))
  } catch {
    /* localStorage unavailable (private mode) — treat as no persisted consent */
  }
  try {
    writeConsentCookie(value)
  } catch {
    /* cookies unavailable — the server then simply never sees consent, which
       fails closed: no measurement events are sent. */
  }
}

/**
 * Reactive consent state. `null` until the user has chosen. Stays in sync
 * across tabs (storage event) and within a tab (custom event).
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    setConsent(readConsent())
    const sync = () => setConsent(readConsent())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return {
    consent,
    accept: () => writeConsent('accepted'),
    decline: () => writeConsent('declined'),
  }
}
