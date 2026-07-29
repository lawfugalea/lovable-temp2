/**
 * The banking dashboard.
 *
 * Composition only: every section is its own component and every fetch lives in a
 * hook, so what remains here is the order things appear in and which state each
 * section is allowed to be in.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { Building2, Loader2, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import UpgradeGate from '@/components/UpgradeGate'
import ModuleFirstRun from '@/components/onboarding/ModuleFirstRun'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { BalancesBlock } from '@/components/banking/BalancesBlock'
import { BalanceTrendBlock } from '@/components/banking/BalanceTrendBlock'
import { BankingDashboardSkeleton } from '@/components/banking/BankingSkeletons'
import { BankingShell } from '@/components/banking/BankingShell'
import { BudgetsBlock } from '@/components/banking/BudgetsBlock'
import { CashFlowBlock } from '@/components/banking/CashFlowBlock'
import { ConnectionsBlock } from '@/components/banking/ConnectionsBlock'
import { DataQualityNote } from '@/components/banking/DataQualityNote'
import { TransactionsPanel } from '@/components/banking/TransactionsPanel'
import { UpcomingBillsBlock } from '@/components/banking/UpcomingBillsBlock'
import type { BankingTab, Transaction } from '@/components/banking/types'
import FinanceCoachPanel from '@/components/finance/FinanceCoachPanel'
import FinanceSubscriptionsPanel from '@/components/finance/FinanceSubscriptionsPanel'
import {
  FinanceRulesPanel,
  FinanceTransactionEditor,
  type EditableFinanceTransaction,
} from '@/components/finance/FinanceTransactionTools'
import { useBankingAnalytics, useBankingOverview, useHouseholdId } from '@/hooks/useBankingData'

const DASHBOARD_PERIOD_DAYS = 30
const TABS: BankingTab[] = ['overview', 'transactions', 'subscriptions', 'coach']

export default function BankingPage() {
  const { status } = useSession()
  const router = useRouter()
  const confirm = useConfirm()
  const { householdId, loading: householdLoading } = useHouseholdId()
  const banking = useBankingOverview(householdId, status === 'authenticated')
  const [clock, setClock] = useState(() => Date.now())
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [rulesReload, setRulesReload] = useState(0)

  const requestedTab = typeof router.query.tab === 'string' ? router.query.tab : 'overview'
  const tab: BankingTab = TABS.includes(requestedTab as BankingTab) ? requestedTab as BankingTab : 'overview'

  const overview = banking.overview
  const analytics = useBankingAnalytics({
    householdId,
    days: DASHBOARD_PERIOD_DAYS,
    enabled: Boolean(overview?.bankEnabled && overview.accounts.length),
    reloadKey: banking.reloadKey,
  })

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // The Statistics tab became its own route; keep existing links working.
  useEffect(() => {
    if (router.isReady && router.query.tab === 'statistics') {
      void router.replace('/banking/analytics')
    }
  }, [router])

  if (householdLoading || banking.loading || status === 'loading') {
    return (
      <ModernAppShell title="Banking">
        <div className="mx-auto max-w-7xl"><BankingDashboardSkeleton /></div>
      </ModernAppShell>
    )
  }

  if (banking.upgradeRequired) {
    return (
      <ModernAppShell title="Banking">
        <div className="mx-auto max-w-3xl pt-8">
          <UpgradeGate
            icon={ShieldCheck}
            module="finances"
            title="See your connected bank accounts in one place"
            description="The Family plan adds read-only banking, transaction insights, recurring-payment detection, and optional coaching."
            bullets={['Read-only balances and activity', 'Spending insights', 'No payment access']}
          />
        </div>
      </ModernAppShell>
    )
  }

  const active = analytics.active
  const canManage = Boolean(overview?.canManage)
  // Owning a bank connection is separate from being the household owner: any adult
  // in the household can connect their own account, and needs to be able to
  // refresh, reconnect and share it. `connections` only ever contains the
  // signed-in user's own.
  const ownConnections = overview?.connections ?? []
  const canConnect = Boolean(overview?.bankEnabled && overview.providerConfigured)
  const currency = active?.currency ?? overview?.totals[0]?.currency ?? 'EUR'
  const hasAccounts = Boolean(overview?.accounts.length)

  const disconnectWithConfirmation = async (connectionId: string) => {
    const connection = ownConnections.find(entry => entry.id === connectionId)
    if (!connection) return
    const confirmed = await confirm({
      title: 'Disconnect bank',
      description: 'Disconnect Bank of Valletta? This revokes consent and permanently removes every imported balance and transaction from Clankeep.',
      confirmText: 'Disconnect',
      destructive: true,
    })
    if (confirmed) await banking.disconnect(connection)
  }

  return (
    <BankingShell
      activeTab={tab}
      heading="Your connected banking"
      description="Balances, spending and upcoming payments, in a separate read-only space."
      notice={banking.notice}
      error={banking.error}
      onCallbackNotice={banking.setNotice}
      onCallbackError={banking.setError}
      headerAction={ownConnections.length ? (
        <Button
          variant="outline"
          disabled={Boolean(banking.action)}
          onClick={() => banking.syncConnection(ownConnections[0].id)}
        >
          {banking.action === `sync:${ownConnections[0].id}`
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
          Refresh
        </Button>
      ) : undefined}
    >
      {!householdId ? (
        <EmptyState
          icon={Building2}
          module="banking"
          title="Create or join a household first"
          description="Banking visibility follows your active household."
        />
      ) : !overview?.bankEnabled ? (
        <EmptyState
          icon={ShieldCheck}
          module="banking"
          title="Open Banking isn't switched on here"
          description="Your household finance plan still works under Finance."
        />
      ) : !hasAccounts ? (
        canConnect ? (
          <ModuleFirstRun
            module="banking"
            title="Connect Bank of Valletta"
            description="You'll continue to BOV to approve read-only access. Clankeep never receives your bank password or any permission to make payments."
            action={
              <Button disabled={Boolean(banking.action)} onClick={() => banking.startConnection()}>
                {banking.action === 'connect' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Connect Bank of Valletta
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Wallet}
            module="banking"
            title="No accounts are shared with you yet"
            description="Whoever connected a bank chooses which accounts the household can see."
          />
        )
      ) : tab === 'overview' ? (
        <div className={`space-y-6 ${analytics.loading ? 'opacity-60' : ''}`} aria-busy={analytics.loading}>
          <BalancesBlock
            accounts={overview.accounts}
            totals={overview.totals}
            currentMonth={active?.currentMonth ?? null}
            currency={currency}
            action={banking.action}
            clock={clock}
            onRename={banking.renameAccount}
            onShare={banking.changeSharing}
          />

          {active ? (
            <>
              <div className="animate-rise animation-delay-100">
                <CashFlowBlock
                  daily={active.daily}
                  range={{ from: active.coverage.dateFrom, to: active.coverage.dateTo }}
                  periodDays={DASHBOARD_PERIOD_DAYS}
                  currency={currency}
                  internalTransfers={active.internalTransfers}
                />
              </div>

              <div className="grid animate-rise animation-delay-200 items-start gap-4 lg:grid-cols-2">
                <BudgetsBlock
                  budgets={active.budgets}
                  currency={currency}
                  canManage={canManage}
                  month={active.currentMonth.month}
                />
                <UpcomingBillsBlock bills={active.upcomingBills} currency={currency} canManage={canManage} />
              </div>

              <div className="animate-rise animation-delay-300">
                <BalanceTrendBlock
                  trend={active.balanceTrend}
                  monthly={active.monthly}
                  currency={currency}
                  drawKey={`${currency}-${DASHBOARD_PERIOD_DAYS}`}
                />
              </div>
            </>
          ) : !analytics.loading && (
            <EmptyState
              icon={Wallet}
              module="banking"
              title="Connected — waiting for the first transactions"
              description="BOV usually returns history within a few minutes of the first sync. The balances above are already live."
            />
          )}

          {ownConnections.length === 0 && canConnect && (
            <section aria-labelledby="banking-connect-own" className="rounded-xl border border-dashed border-border bg-card px-5 py-4">
              <h2 id="banking-connect-own" className="font-display text-lg font-semibold tracking-tight">
                Add your own bank
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                You are seeing accounts somebody else shared. Connecting your own gives the household
                a complete picture — your income counts, and money you move between your accounts and
                theirs stops looking like income on one side.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                disabled={Boolean(banking.action)}
                onClick={() => banking.startConnection()}
              >
                {banking.action === 'connect' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Connect my bank
              </Button>
            </section>
          )}

          {ownConnections.length > 0 && (
            <ConnectionsBlock
              connections={ownConnections}
              action={banking.action}
              clock={clock}
              onReconnect={banking.startConnection}
              onDisconnect={connection => void disconnectWithConfirmation(connection.id)}
            />
          )}

          {active && (
            <DataQualityNote
              dataQuality={active.dataQuality}
              internalTransfers={active.internalTransfers}
              coverage={active.coverage}
              currency={currency}
            />
          )}
        </div>
      ) : tab === 'transactions' ? (
        <div className="space-y-6">
          <TransactionsPanel
            householdId={householdId}
            accounts={overview.accounts}
            reloadKey={banking.reloadKey + rulesReload}
            onError={banking.setError}
            onEdit={setEditing}
          />
          {canManage && (
            <FinanceRulesPanel
              householdId={householdId}
              reloadKey={rulesReload}
              onChanged={() => setRulesReload(value => value + 1)}
              onError={banking.setError}
              onNotice={banking.setNotice}
            />
          )}
        </div>
      ) : tab === 'subscriptions' ? (
        <FinanceSubscriptionsPanel
          householdId={householdId}
          accountId=""
          accounts={overview.accounts}
          canManage={canManage}
          reloadKey={banking.reloadKey}
          onError={banking.setError}
          onNotice={banking.setNotice}
        />
      ) : (
        <FinanceCoachPanel
          householdId={householdId}
          accountId=""
          accounts={overview.accounts}
          canManage={canManage}
          reloadKey={banking.reloadKey}
          onError={banking.setError}
          onNotice={banking.setNotice}
        />
      )}

      <FinanceTransactionEditor
        householdId={householdId}
        transaction={editing as EditableFinanceTransaction | null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setRulesReload(value => value + 1) }}
        onError={banking.setError}
        onNotice={banking.setNotice}
      />
    </BankingShell>
  )
}
