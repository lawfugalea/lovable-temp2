import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { moduleByKey, type ModuleKey } from '@/lib/modules'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  module?: Exclude<ModuleKey, 'home'>
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, module, className }: EmptyStateProps) {
  const tileClass = module ? moduleByKey[module].tileClass : 'bg-primary/10 text-primary'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center',
        className,
      )}
    >
      <span className={cn('grid h-14 w-14 place-items-center rounded-2xl', tileClass)}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export default EmptyState
