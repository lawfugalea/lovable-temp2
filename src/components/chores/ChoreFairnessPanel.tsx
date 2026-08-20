import { useCallback, useEffect, useState } from 'react'
import { Flame, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface MemberContribution {
  userId: string
  name: string
  doneCount: number
  skippedCount: number
  sharePercent: number
}

interface ChoreStats {
  windowDays: number
  streakDays: number
  totalDone: number
  totalSkipped: number
  contributions: MemberContribution[]
}

interface ChoreFairnessPanelProps {
  /** Bumped by the parent after a chore is resolved, to refetch. */
  refreshKey: number
}

/**
 * Who did the chores, and how long the household has kept the run going.
 *
 * Shows shares rather than a leaderboard with a winner: the useful signal in a
 * shared home is "this is lopsided", not "Ana beat Ben". Members who have done
 * nothing are listed at zero for the same reason.
 */
export default function ChoreFairnessPanel({ refreshKey }: ChoreFairnessPanelProps) {
  const [stats, setStats] = useState<ChoreStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const response = await fetch(`/api/chores/stats?today=${today}`)
      if (!response.ok) return
      setStats(await response.json() as ChoreStats)
    } catch {
      // The panel is supplementary; the chore list above it still works.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />
  if (!stats || stats.contributions.length === 0) return null

  // Nothing resolved in the window yet: a row of zeroes reads as an accusation
  // rather than information, so say plainly there is nothing to show.
  if (stats.totalDone === 0 && stats.totalSkipped === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-soft-sm">
        <p className="text-sm text-muted-foreground">
          Once chores start getting ticked off, this is where you will see who did what.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-soft-sm" aria-label="Chore contributions">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-module-chores" aria-hidden="true" />
          Last {stats.windowDays} days
        </h2>
        {stats.streakDays > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-module-chores/10 px-2.5 py-1 text-xs font-bold text-module-chores">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {stats.streakDays} day{stats.streakDays === 1 ? '' : 's'} clear
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-2.5">
        {stats.contributions.map(member => (
          <li key={member.userId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{member.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {member.doneCount} done
                {member.skippedCount > 0 && <> · {member.skippedCount} skipped</>}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={`${member.name}: ${member.sharePercent}% of chores done`}
            >
              <div
                className="h-full rounded-full bg-module-chores transition-[width]"
                style={{ width: `${member.sharePercent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
