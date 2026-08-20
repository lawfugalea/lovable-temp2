import { ListChecks } from 'lucide-react'
import ChoreRow from '@/components/chores/ChoreRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

export { todayItemKey }
export type { TodayChoreItem }

interface ChoreTodayListProps {
  items: TodayChoreItem[]
  /** Occurrences with a request in flight. Guards double taps without disabling. */
  busyKeys: ReadonlySet<string>
  compact?: boolean
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
  emptyAction?: React.ReactNode
}

/**
 * A flat list of chore occurrences in one card. Still used by the dashboard's
 * compact widget; the chores page uses ChoreGroupedList instead.
 */
export default function ChoreTodayList({
  items,
  busyKeys,
  compact = false,
  onResolve,
  onUndo,
  emptyAction,
}: ChoreTodayListProps) {
  if (!items.length) {
    if (compact) return null
    return (
      <EmptyState
        icon={ListChecks}
        module="chores"
        title="Nothing due today"
        description="Chores appear here on the days they are scheduled. Enjoy the quiet."
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('divide-y overflow-hidden rounded-xl border', compact && 'rounded-lg')}>
      {items.map(item => (
        <ChoreRow
          key={todayItemKey(item)}
          item={item}
          busy={busyKeys.has(todayItemKey(item))}
          compact={compact}
          onResolve={onResolve}
          onUndo={onUndo}
        />
      ))}
    </div>
  )
}
