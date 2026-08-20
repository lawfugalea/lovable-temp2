import Link from 'next/link'
import { ArrowRight, Sparkles, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { moduleByKey, type ModuleKey } from '@/lib/modules'

interface UpgradeGateProps {
  icon: LucideIcon
  module?: Exclude<ModuleKey, 'home'>
  title: string
  description: string
  bullets?: string[]
  className?: string
}

/** Honest locked-state card: says what the Family plan adds and links to billing. */
export default function UpgradeGate({ icon: Icon, module, title, description, bullets, className }: UpgradeGateProps) {
  const tileClass = module ? moduleByKey[module].tileClass : 'bg-primary/10 text-primary'
  return (
    <div className={cn('rounded-2xl border bg-card p-8 text-center shadow-soft-sm', className)}>
      <span className={cn('mx-auto grid h-14 w-14 place-items-center rounded-2xl', tileClass)}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
          {bullets.map(bullet => (
            <li key={bullet} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {bullet}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-col items-center gap-2">
        <Button asChild className="min-h-11">
          <Link href="/settings?tab=billing">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            See the Family plan — €4.99/month
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">Everything you use today stays free. Cancel anytime.</p>
      </div>
    </div>
  )
}
