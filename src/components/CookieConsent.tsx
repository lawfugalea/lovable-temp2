import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { useCookieConsent } from '@/lib/cookie-consent'

/**
 * Bottom-anchored cookie banner shown on public pages until the visitor chooses.
 * Declining is as easy as accepting; only accepting loads non-essential
 * third-party scripts (the Kelma chat widget). Essential cookies are unaffected.
 */
export default function CookieConsent() {
  const { consent, accept, decline } = useCookieConsent()

  if (consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-card/95 p-5 shadow-soft-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use essential cookies to run ClanKeep. With your consent we also load our optional chat assistant, which
            sets its own cookies. See our{' '}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={decline}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
