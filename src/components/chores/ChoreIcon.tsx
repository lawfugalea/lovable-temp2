import { Check, SkipForward, type LucideIcon } from 'lucide-react'
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
 * Renders a resolved icon component received as a prop, the same shape as
 * `EmptyState`'s `icon: LucideIcon` prop (`src/components/ui/EmptyState.tsx`).
 * A separate component is required here, not an inline `<Identity />` from a
 * locally-computed variable: the latter trips this repo's
 * `react-hooks/static-components` lint rule (a component "created" during
 * render loses its state and identity every render), because it flags a
 * capitalized variable assigned from a function call and then used as a JSX
 * tag. Receiving the same component as a *prop* does not trigger the rule.
 */
function ChoreIdentityIcon({ Icon, className }: { Icon: LucideIcon; className?: string }) {
  return <Icon className={className} />
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
  const identityIconComponent = choreIconComponent(resolveChoreIconId({ title, icon }))
  return (
    <span className={cn(choreBoxClasses(status, overdue), className)} aria-hidden="true">
      {status === 'DONE' ? (
        <Check className="h-4 w-4 animate-check-in" strokeWidth={3} />
      ) : status === 'SKIPPED' ? (
        <SkipForward className="h-4 w-4 animate-check-in" />
      ) : (
        <ChoreIdentityIcon Icon={identityIconComponent} className="h-[17px] w-[17px]" />
      )}
    </span>
  )
}

export default ChoreIcon
