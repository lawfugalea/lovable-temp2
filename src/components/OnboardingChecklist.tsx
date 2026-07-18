import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Check, ListChecks, Scale, ShoppingBasket, UsersRound, UtensilsCrossed, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingSteps {
  invitedMember: boolean
  addedShoppingItem: boolean
  matchedProduct: boolean
  plannedMeal: boolean
  createdChore: boolean
}

const STEP_ROWS = [
  { key: 'addedShoppingItem', label: 'Add your first shopping item', href: '/shopping', icon: ShoppingBasket, colorClass: 'text-module-shopping', tileClass: 'bg-module-shopping/10' },
  { key: 'matchedProduct', label: 'Match an item to compare supermarket prices', href: '/shopping', icon: Scale, colorClass: 'text-module-shopping', tileClass: 'bg-module-shopping/10' },
  { key: 'plannedMeal', label: 'Plan a dinner this week', href: '/meals', icon: UtensilsCrossed, colorClass: 'text-module-meals', tileClass: 'bg-module-meals/10' },
  { key: 'createdChore', label: 'Set up a recurring chore', href: '/chores', icon: ListChecks, colorClass: 'text-module-chores', tileClass: 'bg-module-chores/10' },
  { key: 'invitedMember', label: 'Invite someone from your household', href: '/household', icon: UsersRound, colorClass: 'text-primary', tileClass: 'bg-primary/10' },
] as const

/** Getting-started card: computed live, only the dismissal is stored. */
export default function OnboardingChecklist() {
  const { data: session } = useSession()
  const isDemo = (session?.user as { isDemo?: boolean } | undefined)?.isDemo === true
  const [steps, setSteps] = useState<OnboardingSteps | null>(null)
  const [householdId, setHouseholdId] = useState('')
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    if (isDemo) return
    void (async () => {
      try {
        const response = await fetch('/api/onboarding/status')
        if (!response.ok) return
        const data = await response.json()
        setSteps(data.steps as OnboardingSteps)
        setHouseholdId(typeof data.householdId === 'string' ? data.householdId : '')
        const stateResponse = await fetch(`/api/page-state?householdId=${encodeURIComponent(data.householdId)}&page=onboarding`)
        if (stateResponse.ok) {
          const state = await stateResponse.json()
          setDismissed(Boolean((state.data as { dismissed?: boolean } | null)?.dismissed))
        } else {
          setDismissed(false)
        }
      } catch {
        // stay hidden on failure
      }
    })()
  }, [isDemo])

  const dismiss = useCallback(async () => {
    setDismissed(true)
    if (!householdId) return
    try {
      await fetch('/api/page-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, page: 'onboarding', data: { dismissed: true } }),
      })
    } catch {
      // dismissal is cosmetic; ignore failures
    }
  }, [householdId])

  if (isDemo || !steps || dismissed !== false) return null
  const doneCount = STEP_ROWS.filter(row => steps[row.key]).length
  if (doneCount === STEP_ROWS.length) return null

  return (
    <section aria-labelledby="onboarding-heading" className="relative animate-rise rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6">
      <button
        type="button"
        onClick={() => void dismiss()}
        aria-label="Dismiss getting started checklist"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-4 pr-10">
        <div>
          <h2 id="onboarding-heading" className="font-display text-lg font-bold tracking-tight">Make this home yours</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{doneCount} of {STEP_ROWS.length} done — each one takes under a minute.</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(doneCount / STEP_ROWS.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-1">
        {STEP_ROWS.map(row => {
          const done = steps[row.key]
          const Icon = row.icon
          return (
            <li key={row.key}>
              <Link
                href={row.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/60',
                  done && 'opacity-60',
                )}
              >
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', done ? 'bg-primary/10 text-primary' : cn(row.tileClass, row.colorClass))}>
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn('min-w-0 flex-1 text-sm font-medium', done && 'line-through')}>{row.label}</span>
                {!done && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
