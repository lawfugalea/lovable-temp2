import { Check, SkipForward } from 'lucide-react'
import { choreIconComponent, resolveChoreIconId } from '@/lib/chore-icons'
import { choreBoxClasses, type ChoreStatus } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

interface ChoreIconProps {
  title: string
  icon: string | null
  status: ChoreStatus
  overdue: boolean
  className?: string
}

/**
 * The 36px box on a chore row: an icon for what the chore *is*, swapping to a
 * check or skip mark when it is resolved.
 *
 * This is the only component that depends on both the icon registry and the
 * motion vocabulary. Everything about the box's colour, including the
 * reduced-motion-safe amber overdue ring, comes from choreBoxClasses.
 *
 * Decorative: the row's title carries the meaning, and the surrounding button
 * carries the label, so everything here is aria-hidden.
 */
export function ChoreIcon({ title, icon, status, overdue, className }: ChoreIconProps) {
  const Identity = choreIconComponent(resolveChoreIconId({ title, icon }))
  return (
    <span className={cn(choreBoxClasses(status, overdue), className)} aria-hidden="true">
      {status === 'DONE' ? (
        <Check className="h-4 w-4 animate-check-in" strokeWidth={3} />
      ) : status === 'SKIPPED' ? (
        <SkipForward className="h-4 w-4 animate-check-in" />
      ) : (
        <Identity className="h-[17px] w-[17px]" />
      )}
    </span>
  )
}

export default ChoreIcon
