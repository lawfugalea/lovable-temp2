import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Sparkles } from 'lucide-react'

/**
 * Persistent upgrade entry point for free households — visible on every
 * screen in the shell header. Hidden for Family, demo, and signed-out users.
 */
export default function UpgradeButton() {
  const { status } = useSession()
  const [isFree, setIsFree] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/billing/summary')
        if (!response.ok) return
        const data = await response.json()
        if (active) setIsFree(data.plan === 'FREE' && data.effectiveVia === 'free' && data.billingConfigured === true)
      } catch {
        // stay hidden on failure
      }
    })()
    return () => { active = false }
  }, [status])

  if (!isFree) return null
  return (
    <Link
      href="/settings?tab=billing"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#4D6BFF] to-[#7B61FF] px-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Upgrade</span>
    </Link>
  )
}
