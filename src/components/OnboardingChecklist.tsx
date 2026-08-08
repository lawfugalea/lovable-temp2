import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Compass, FileText, ListChecks, ShoppingBasket, UsersRound, UtensilsCrossed, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import type { OnboardingSteps } from '@/lib/onboarding-client'

type StepKey = keyof OnboardingSteps

const STEP_ROWS = [
  { key: 'addedShoppingItem', label: 'Add your first shopping item', href: '/shopping', icon: ShoppingBasket, colorClass: 'text-module-shopping', tileClass: 'bg-module-shopping/10' },
  { key: 'wroteNote', label: 'Pin your first household note', href: '/notes', icon: FileText, colorClass: 'text-module-notes', tileClass: 'bg-module-notes/10' },
  { key: 'plannedMeal', label: 'Plan a dinner this week', href: '/meals', icon: UtensilsCrossed, colorClass: 'text-module-meals', tileClass: 'bg-module-meals/10' },
  { key: 'createdChore', label: 'Set up a recurring chore', href: '/chores', icon: ListChecks, colorClass: 'text-module-chores', tileClass: 'bg-module-chores/10' },
  { key: 'invitedMember', label: 'Invite someone from your household', href: '/household', icon: UsersRound, colorClass: 'text-primary', tileClass: 'bg-primary/10' },
] as const satisfies readonly { key: StepKey; label: string; href: string; icon: typeof ShoppingBasket; colorClass: string; tileClass: string }[]

const TOUR_ROW = { label: 'Take the guided tour', icon: Compass, colorClass: 'text-primary', tileClass: 'bg-primary/10' }

interface OnboardingChecklistProps {
  /** Starts the guided tour. Omitted when the tour is unavailable. */
  onStartTour?: () => void
}

/**
 * Getting-started card. Progress is computed live from household data; only the
 * dismissal is stored, and it is stored per user — dismissing it no longer hides
 * the card for everyone else in the household.
 */
export default function OnboardingChecklist({ onStartTour }: OnboardingChecklistProps) {
  const onboarding = useOnboarding()

  const dismiss = useCallback(() => {
    // Cosmetic: the optimistic local update is what the user sees, and a failed
    // write only means the card returns on the next load.
    void onboarding?.update({ checklistDismissed: true }).catch(() => {})
  }, [onboarding])

  if (!onboarding) return null

  if (onboarding.status === 'loading' || onboarding.status === 'idle') {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }
  // On failure render nothing, but the provider does not cache the rejection —
  // the next mount retries rather than hiding the card for the whole session.
  if (onboarding.status === 'error' || !onboarding.state) return null

  const { user, steps } = onboarding.state
  if (user.isDemo || !steps) return null
  if (user.checklistDismissedAt !== null) return null

  const tourDone = user.tourCompletedAt !== null
  const showTourRow = typeof onStartTour === 'function'
  const total = STEP_ROWS.length + (showTourRow ? 1 : 0)
  const doneCount = STEP_ROWS.filter((row) => steps[row.key]).length + (showTourRow && tourDone ? 1 : 0)
  if (doneCount === total) return null

  const TourIcon = TOUR_ROW.icon

  return (
    <section
      data-tour="checklist"
      aria-labelledby="onboarding-heading"
      className="relative animate-rise rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss getting started checklist"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-4 pr-10">
        <div>
          <h2 id="onboarding-heading" className="font-display text-lg font-bold tracking-tight">Make this home yours</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{doneCount} of {total} done — each one takes under a minute.</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(doneCount / total) * 100}%` }} />
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
        {showTourRow && (
          <li>
            <button
              type="button"
              onClick={onStartTour}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tourDone && 'opacity-60',
              )}
            >
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tourDone ? 'bg-primary/10 text-primary' : cn(TOUR_ROW.tileClass, TOUR_ROW.colorClass))}>
                {tourDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <TourIcon className="h-4 w-4" />}
              </span>
              <span className={cn('min-w-0 flex-1 text-sm font-medium', tourDone && 'line-through')}>{TOUR_ROW.label}</span>
              {!tourDone && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
            </button>
          </li>
        )}
      </ul>
    </section>
  )
}
