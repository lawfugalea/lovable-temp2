import { useEffect, useState } from 'react'

/**
 * Consent for NON-essential cookies/third-party scripts (currently the Kelma
 * chat widget). Essential session/security cookies never depend on this.
 */
export type CookieConsent = 'accepted' | 'declined'

const STORAGE_KEY = 'clankeep-cookie-consent'
const EVENT = 'clankeep-cookie-consent-change'

export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function writeConsent(value: CookieConsent): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }))
  } catch {
    /* localStorage unavailable (private mode) — treat as no persisted consent */
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
