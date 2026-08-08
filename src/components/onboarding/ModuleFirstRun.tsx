import type { ReactNode } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { moduleByKey, type ModuleKey } from '@/lib/modules'
import { moduleHelp } from '@/lib/help-content'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'

interface ModuleFirstRunProps {
  module: Exclude<ModuleKey, 'home'>
  /** The one obvious next step. Replaced by an upgrade link on a locked area. */
  action?: ReactNode
  /** Override the default copy when a page needs something more specific. */
  title?: string
  description?: string
  className?: string
}

/**
 * The empty state for an area the household has never used — as opposed to one
 * that is empty right now because of a filter, or because everything is done.
 * Only the former should explain what the area is for; telling someone who just
 * cleared their shopping list what shopping lists are reads as broken.
 */
export default function ModuleFirstRun({ module, action, title, description, className }: ModuleFirstRunProps) {
  const entry = moduleByKey[module]
  const help = moduleHelp[module]
  const onboarding = useOnboarding()
  const entitlements = onboarding?.state?.entitlements ?? null

  const locked = (() => {
    if (!help.requiresFeature || !entitlements) return false
    switch (help.requiresFeature) {
      case 'finance': return !entitlements.canUseFinance
      case 'ai': return !entitlements.canUseAi
      case 'pushReminders': return !entitlements.canUsePushReminders
      case 'medicinePdf': return !entitlements.canExportMedicinePdf
      case 'children': return !entitlements.unlimitedChildren
      case 'priceComparison': return !entitlements.canUsePriceComparison
      default: return false
    }
  })()

  return (
    <EmptyState
      className={className}
      module={module}
      icon={entry.icon}
      title={title ?? `${entry.name} starts here`}
      description={description ?? help.summary}
      action={
        <div className="flex flex-col items-center gap-3">
          {locked ? (
            <Button asChild>
              <Link href="/settings?tab=billing">See the Family plan</Link>
            </Button>
          ) : (
            action
          )}
          <Link
            href={`/help#${module}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            What is {entry.name.toLowerCase()} for?
          </Link>
        </div>
      }
    />
  )
}
