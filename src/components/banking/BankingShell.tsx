/**
 * The frame both banking routes share: heading, alerts, section navigation, and
 * the handling of the parameters Enable Banking sends us back with.
 */
import { type ReactNode, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ShieldCheck } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import { BankingAlerts } from './BankingAlerts'
import { BankingTabs } from './BankingTabs'
import type { BankingTab } from './types'

const CALLBACK_MESSAGES: Record<string, string> = {
  authorization_cancelled: 'Bank connection was cancelled.',
  session_expired: 'Your Clankeep session expired. Sign in and connect again.',
  invalid_or_expired_state: 'That bank connection link expired. Please start again.',
}

export type BankingShellProps = {
  activeTab: BankingTab
  heading: string
  description: string
  headerAction?: ReactNode
  notice?: string | null
  error?: string | null
  onCallbackNotice?: (message: string) => void
  onCallbackError?: (message: string) => void
  children: ReactNode
}

export function BankingShell({
  activeTab,
  heading,
  description,
  headerAction,
  notice,
  error,
  onCallbackNotice,
  onCallbackError,
  children,
}: BankingShellProps) {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const { bankConnected, bankError, syncWarning, ...rest } = router.query
    if (!bankConnected && !bankError && !syncWarning) return
    if (bankConnected === '1') {
      onCallbackNotice?.(syncWarning === '1'
        ? 'Bank connected. The first sync needs another try.'
        : 'Bank of Valletta connected successfully.')
    } else if (bankError) {
      onCallbackError?.(CALLBACK_MESSAGES[String(bankError)] || 'The bank connection could not be completed.')
    }
    // Clear only the callback parameters. Replacing with a bare path would drop
    // every other parameter, including the tab the reader is on.
    void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
  }, [onCallbackError, onCallbackNotice, router])

  return (
    <ModernAppShell title="Banking">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Read-only Open Banking
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{heading}</h1>
            <p className="mt-1 text-muted-foreground">{description}</p>
          </div>
          {headerAction}
        </div>

        <BankingAlerts notice={notice} error={error} />
        <BankingTabs active={activeTab} />
        {children}
      </div>
    </ModernAppShell>
  )
}
