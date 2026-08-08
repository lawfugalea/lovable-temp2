import { signOut } from 'next-auth/react'
import { withBasePath } from '@/lib/base-path'
import { clearOutbox } from '@/lib/shopping-outbox'

/**
 * Sign out and leave nothing household-shaped behind on the device.
 *
 * The service worker caches shopping lists so they stay readable in a shop with
 * no signal, and the outbox holds writes queued while offline. Both are stored
 * per-device, not per-session, so signing out has to clear them explicitly —
 * otherwise the next person handed the phone could open the installed app and
 * read the previous account's list straight from cache.
 */
export async function signOutAndClearDevice(): Promise<void> {
  clearOutbox()

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration(withBasePath('/'))
      registration?.active?.postMessage({ type: 'clankeep-clear-cache' })
    }
  } catch {
    // Never block sign-out on cache cleanup — being signed out matters more.
  }

  await signOut({ callbackUrl: withBasePath('/login') })
}
