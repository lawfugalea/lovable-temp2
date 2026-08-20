import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Sparkles } from 'lucide-react'

/** Amber strip shown to demo sessions: sample data, resets after 24 hours. */
export default function DemoBanner() {
  const { data: session } = useSession()
  const isDemo = (session?.user as { isDemo?: boolean } | undefined)?.isDemo === true
  if (!isDemo) return null

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 sm:flex-row sm:gap-3 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        You&rsquo;re exploring a sample household — it resets after 24 hours.
      </span>
      <Link
        href="/register"
        className="font-bold underline underline-offset-2 hover:no-underline"
      >
        Create your free account
      </Link>
    </div>
  )
}
