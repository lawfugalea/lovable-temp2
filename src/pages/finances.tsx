import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Link2,
  LayoutDashboard,
  Loader2,
  Pencil,
  RefreshCw,
  Repeat2,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react'
import UpgradeGate from '@/components/UpgradeGate'
import ModernAppShell from '@/components/ModernAppShell'
import PlannerPanel from '@/components/finance/PlannerPanel'
import PlannerGoalsPanel from '@/components/finance/PlannerGoalsPanel'
import PlannerCoachPanel from '@/components/finance/PlannerCoachPanel'
import type { PlannerData } from '@/components/finance/planner-types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import FinanceInsightsPanel, { FinanceStatisticsPanel } from '@/components/finance/FinanceInsightsPanel'
import FinanceSubscriptionsPanel from '@/components/finance/FinanceSubscriptionsPanel'
import FinanceCoachPanel from '@/components/finance/FinanceCoachPanel'
import {
  EditTransactionButton,
  FinanceRulesPanel,
  FinanceTransactionEditor,
  type EditableFinanceTransaction,
} from '@/components/finance/FinanceTransactionTools'
import type { FinanceInsights } from '@/lib/finance/insights'

type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'REAUTH_REQUIRED' | 'ERROR'

type Connection = {
  id: string
  aspspName: string
  status: ConnectionStatus
  consentExpiresAt: string | null
  lastSyncedAt: string | null
  lastSyncAttemptAt: string | null
  syncStartedAt: string | null
  syncError: string | null
  _count?: { accounts: number }
}

type Account = {
  id: string
  displayName: string
  providerDisplayName: string
  customName: string | null
  maskedIdentifier: string | null
  currency: string
  cashAccountType: string | null
  shared: boolean
  owned: boolean
  canRename: boolean
  balance: { amount: string; currency: string; type: string; updatedAt: string } | null
  availableBalance: { amount: string; currency: string } | null
  bookedBalance: { amount: string; currency: string } | null
  connection: Connection & { userId: string }
}

type Transaction = {
  id: string
  account: { id: string; displayName: string; maskedIdentifier: string | null }
  amount: string
  currency: string
  status: 'BOOKED' | 'PENDING'
  bookingDate: string | null
  valueDate: string | null
  counterparty: string | null
  description: string | null
  merchantName: string
  detail: string | null
  transactionType: string
  category: string
  signedAmount: number
  originalMerchantName: string
  originalCategory: string
  enrichmentSource: 'local' | 'rule' | 'override'
  ruleId: string | null
  canEdit: boolean
}

type Overview = {
  bankEnabled: boolean
  canManage: boolean
  providerConfigured: boolean
  accounts: Account[]
  connections: Connection[]
  totals: Array<{ currency: string; amount: string }>
  recentTransactions: Transaction[]
}

function currency(amount: string | number, code = 'EUR'): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value)) return `${amount} ${code}`
  try {
    return new Intl.NumberFormat('en-MT', { style: 'currency', currency: code }).format(value)
  } catch {
    return `${value.toFixed(2)} ${code}`
  }
}

function friendlyDate(value: string | null): string {
  if (!value) return 'Date unavailable'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-MT', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

function relativeSync(value: string | null, now: number): string {
  if (!value) return 'Not synced yet'
  const elapsed = now - new Date(value).getTime()
  if (elapsed < 60_000) return 'Synced just now'
  if (elapsed < 60 * 60_000) return `Synced ${Math.floor(elapsed / 60_000)} min ago`
  if (elapsed < 24 * 60 * 60_000) return `Synced ${Math.floor(elapsed / 3_600_000)} hr ago`
  return `Synced ${friendlyDate(value)}`
}

function connectionTone(status: ConnectionStatus) {
  if (status === 'ACTIVE') return { label: 'Connected', className: 'bg-green-50 text-green-700 border-green-200' }
  if (status === 'REAUTH_REQUIRED') return { label: 'Reconnect required', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  if (status === 'ERROR') return { label: 'Sync problem', className: 'bg-red-50 text-red-700 border-red-200' }
  return { label: 'Connecting', className: 'bg-blue-50 text-blue-700 border-blue-200' }
}

export default function FinancesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [householdId, setHouseholdId] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [insights, setInsights] = useState<FinanceInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightDays, setInsightDays] = useState(90)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [transactionReload, setTransactionReload] = useState(0)
  const [clock, setClock] = useState(0)
  const [activeTab, setActiveTab] = useState<'plan' | 'goals' | 'plannercoach' | 'overview' | 'statistics' | 'transactions' | 'subscriptions' | 'coach'>('plan')
  const [planner, setPlanner] = useState<PlannerData | null>(null)
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [renamingAccount, setRenamingAccount] = useState<string | null>(null)
  const [accountName, setAccountName] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<EditableFinanceTransaction | null>(null)
  const [rulesReload, setRulesReload] = useState(0)
  const autoSyncAttempted = useRef(new Set<string>())

  useEffect(() => {
    const update = () => setClock(Date.now())
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.bankConnected === '1') {
      setNotice(router.query.syncWarning === '1'
        ? 'Bank connected. The first sync needs another try.'
        : 'Bank of Valletta connected successfully.')
    } else if (router.query.bankError) {
      const messages: Record<string, string> = {
        authorization_cancelled: 'Bank connection was cancelled.',
        session_expired: 'Your Clankeep session expired. Sign in and connect again.',
        invalid_or_expired_state: 'That bank connection link expired. Please start again.',
      }
      setError(messages[String(router.query.bankError)] || 'The bank connection could not be completed.')
    }
    if (router.query.bankConnected || router.query.bankError || router.query.syncWarning) {
      void router.replace('/finances', undefined, { shallow: true })
    }
  }, [router.isReady, router.query.bankConnected, router.query.bankError, router.query.syncWarning, router])

  const loadOverview = useCallback(async (id: string, showLoader = false) => {
    if (showLoader) setLoading(true)
    const response = await fetch(`/api/finance/overview?householdId=${encodeURIComponent(id)}`)
    const payload = await response.json().catch(() => null)
    if (response.status === 403 && payload?.code === 'upgrade_required') {
      setUpgradeRequired(true)
      setLoading(false)
      return
    }
    if (!response.ok) throw new Error(payload?.error || 'Unable to load finances')
    setUpgradeRequired(false)
    setOverview(payload as Overview)
    setLoading(false)
  }, [])

  const loadPlanner = useCallback(async (id: string) => {
    setPlannerLoading(true)
    try {
      const response = await fetch(`/api/finance/planner?householdId=${encodeURIComponent(id)}`)
      const payload = await response.json().catch(() => null)
      if (response.status === 403 && payload?.code === 'upgrade_required') {
        setUpgradeRequired(true)
        return
      }
      if (!response.ok) throw new Error(payload?.error || 'Unable to load the money planner')
      setPlanner(payload as PlannerData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the money planner')
    } finally {
      setPlannerLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      try {
        const response = await fetch('/api/household/active')
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || 'Unable to load household')
        if (!active) return
        const id = typeof payload?.householdId === 'string' ? payload.householdId : ''
        setHouseholdId(id)
        if (id) {
          await Promise.all([loadOverview(id, true), loadPlanner(id)])
        } else setLoading(false)
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load finances')
          setLoading(false)
        }
      }
    })()
    return () => { active = false }
  }, [status, loadOverview, loadPlanner])

  const loadTransactions = useCallback(async (append = false) => {
    if (!householdId || !overview?.bankEnabled || overview.accounts.length === 0) return
    setTransactionsLoading(true)
    try {
      const query = new URLSearchParams({ householdId })
      if (accountFilter) query.set('accountId', accountFilter)
      if (statusFilter) query.set('status', statusFilter)
      if (dateFrom) query.set('dateFrom', dateFrom)
      if (dateTo) query.set('dateTo', dateTo)
      if (search) query.set('search', search)
      if (append && nextCursor) query.set('cursor', nextCursor)
      const response = await fetch(`/api/finance/transactions?${query.toString()}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load transactions')
      setTransactions(current => append ? [...current, ...(payload.transactions || [])] : payload.transactions || [])
      setNextCursor(payload.nextCursor || null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load transactions')
    } finally {
      setTransactionsLoading(false)
    }
  }, [accountFilter, dateFrom, dateTo, householdId, nextCursor, overview, search, statusFilter])

  useEffect(() => {
    if (!overview || !householdId) return
    void loadTransactions(false)
    // nextCursor intentionally excluded; changing it must not reload page one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter, dateFrom, dateTo, householdId, overview?.accounts.length, search, statusFilter, transactionReload])

  const loadInsights = useCallback(async () => {
    if (!householdId || !overview?.accounts.length) return
    setInsightsLoading(true)
    try {
      const query = new URLSearchParams({ householdId, days: String(insightDays) })
      if (accountFilter) query.set('accountId', accountFilter)
      const response = await fetch(`/api/finance/insights?${query.toString()}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load finance insights')
      setInsights(payload as FinanceInsights)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load finance insights')
    } finally {
      setInsightsLoading(false)
    }
  }, [accountFilter, householdId, insightDays, overview?.accounts.length])

  useEffect(() => {
    void loadInsights()
  }, [loadInsights, transactionReload])

  const syncConnection = useCallback(async (connectionId: string, automatic = false) => {
    if (!householdId) return
    setAction(`sync:${connectionId}`)
    if (!automatic) {
      setError(null)
      setNotice(null)
    }
    try {
      const response = await fetch(`/api/finance/connections/${encodeURIComponent(connectionId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Bank sync failed')
      await loadOverview(householdId)
      setTransactionReload(value => value + 1)
      if (!automatic) setNotice('Bank data refreshed.')
    } catch (syncError) {
      if (!automatic) setError(syncError instanceof Error ? syncError.message : 'Bank sync failed')
      await loadOverview(householdId).catch(() => undefined)
    } finally {
      setAction(null)
    }
  }, [householdId, loadOverview])

  useEffect(() => {
    if (!overview?.canManage) return
    for (const connection of overview.connections) {
      const stale = !connection.lastSyncedAt
        || Date.now() - new Date(connection.lastSyncedAt).getTime() > 15 * 60_000
      if (connection.status === 'ACTIVE' && stale && !autoSyncAttempted.current.has(connection.id)) {
        autoSyncAttempted.current.add(connection.id)
        void syncConnection(connection.id, true)
      }
    }
  }, [overview, syncConnection])

  const startConnection = async (connectionId?: string) => {
    if (!householdId) return
    setError(null)
    setNotice(null)
    setAction(connectionId ? `reconnect:${connectionId}` : 'connect')
    try {
      const response = await fetch('/api/finance/connections/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...(connectionId ? { connectionId } : {}) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to start bank connection')
      window.location.assign(payload.authorizationUrl)
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : 'Unable to start bank connection')
      setAction(null)
    }
  }

  const changeSharing = async (account: Account) => {
    if (!householdId) return
    setAction(`share:${account.id}`)
    setError(null)
    try {
      const response = await fetch(`/api/finance/accounts/${encodeURIComponent(account.id)}/sharing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, shared: !account.shared }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to change sharing')
      await loadOverview(householdId)
      setNotice(account.shared ? 'Account is now private.' : 'Account is now visible to your household.')
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'Unable to change sharing')
    } finally {
      setAction(null)
    }
  }

  const disconnect = async (connection: Connection) => {
    if (!householdId || !window.confirm(
      'Disconnect Bank of Valletta? This revokes consent and permanently removes every imported balance and transaction from Clankeep.',
    )) return
    setAction(`disconnect:${connection.id}`)
    setError(null)
    try {
      const response = await fetch(`/api/finance/connections/${encodeURIComponent(connection.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to disconnect bank')
      setAccountFilter('')
      await loadOverview(householdId)
      setTransactionReload(value => value + 1)
      setNotice('Bank disconnected and imported data deleted.')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect bank')
    } finally {
      setAction(null)
    }
  }

  const renameAccount = async (account: Account, reset = false) => {
    if (!householdId) return
    setAction(`rename:${account.id}`)
    setError(null)
    try {
      const response = await fetch(`/api/finance/accounts/${encodeURIComponent(account.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, customName: reset ? null : accountName }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to rename account')
      setRenamingAccount(null)
      await loadOverview(householdId)
      setTransactionReload(value => value + 1)
      setNotice(reset ? 'Account name reset to the bank name.' : 'Friendly account name saved.')
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Unable to rename account')
    } finally { setAction(null) }
  }

  const selectedAccountIds = useMemo(() => new Set(overview?.accounts.map(account => account.id) || []), [overview])
  useEffect(() => {
    if (accountFilter && !selectedAccountIds.has(accountFilter)) setAccountFilter('')
  }, [accountFilter, selectedAccountIds])

  if (loading || status === 'loading') {
    return (
      <ModernAppShell title="Finance">
        <div className="min-h-[420px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            Loading your finances…
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (upgradeRequired) {
    return (
      <ModernAppShell title="Finance">
        <div className="mx-auto max-w-3xl pt-8">
          <UpgradeGate
            icon={ShieldCheck}
            module="finances"
            title="See the whole household&rsquo;s money in one calm view"
            description="The Family plan connects your bank read-only through official open banking — balances, transactions, a subscription radar, and AI spending insights, shared on your terms."
            bullets={['Read-only — Clankeep can never move money', 'Bank of Valletta via Enable Banking', 'You choose what the household sees']}
          />
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Finance">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-primary">
              <ShieldCheck className="w-4 h-4" />
              {overview?.bankEnabled ? 'Read-only open banking' : 'Private household planner'}
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Your money, in one calm view</h1>
            <p className="text-muted-foreground mt-1">
              {overview?.bankEnabled
                ? 'Your plan plus live Bank of Valletta activity.'
                : 'What comes in, what goes out, and what is truly yours to direct.'}
            </p>
          </div>
          {overview?.canManage && overview.connections.length > 0 && (
            <Button
              variant="outline"
              onClick={() => syncConnection(overview.connections[0].id)}
              disabled={Boolean(action)}
            >
              {action === `sync:${overview.connections[0].id}`
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          )}
        </div>

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {householdId && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-2 lg:flex-row lg:items-center lg:justify-between">
            <nav className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap" aria-label="Finance sections">
              {([
                ['plan', 'My plan', Wallet],
                ['goals', 'Goals', Target],
                ['plannercoach', 'Coach', Sparkles],
                ...(overview?.bankEnabled
                  ? ([
                      ['overview', 'Accounts', LayoutDashboard],
                      ['statistics', 'Statistics', BarChart3],
                      ['transactions', 'Transactions', ReceiptText],
                      ['subscriptions', 'Subscriptions', Repeat2],
                      ['coach', 'Bank coach', WalletCards],
                    ] as const)
                  : []),
              ] as ReadonlyArray<readonly [typeof activeTab, string, typeof Wallet]>).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </nav>
            {overview && overview.accounts.length > 0 && !['plan', 'goals', 'plannercoach'].includes(activeTab) && (
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm lg:min-w-52"
                value={accountFilter}
                onChange={event => setAccountFilter(event.target.value)}
                aria-label="Focus finance page on one account"
              >
                <option value="">All visible accounts</option>
                {overview.accounts.map(account => <option key={account.id} value={account.id}>{account.displayName}</option>)}
              </select>
            )}
          </div>
        )}

        {householdId && activeTab === 'plan' && (
          planner ? (
            <PlannerPanel
              householdId={householdId}
              data={planner}
              onChanged={() => void loadPlanner(householdId)}
              onError={setError}
            />
          ) : plannerLoading ? (
            <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your plan…
            </div>
          ) : null
        )}
        {householdId && activeTab === 'goals' && planner && (
          <PlannerGoalsPanel
            householdId={householdId}
            data={planner}
            onChanged={() => void loadPlanner(householdId)}
            onError={setError}
          />
        )}
        {householdId && activeTab === 'plannercoach' && planner && (
          <PlannerCoachPanel householdId={householdId} data={planner} onError={setError} />
        )}

        {!householdId && (
          <Card>
            <CardContent className="py-12 text-center">
              <WalletCards className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Create or join a household first</h2>
              <p className="text-sm text-muted-foreground mt-1">Finance visibility follows your active household.</p>
            </CardContent>
          </Card>
        )}

        {householdId && overview?.bankEnabled && activeTab === 'overview' && overview.canManage && !overview.providerConfigured && (
          <Card className="border-amber-200">
            <CardContent className="py-8">
              <h2 className="font-semibold">Enable Banking setup needed</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Register a restricted-production application, pre-link your BOV accounts, then configure its application ID and base64-encoded private key in Clankeep.
              </p>
            </CardContent>
          </Card>
        )}

        {householdId && overview?.bankEnabled && activeTab === 'overview' && overview.accounts.length === 0 && (
          <Card className="overflow-hidden">
            <CardContent className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              {overview.canManage ? (
                <>
                  <h2 className="text-xl font-semibold">Connect Bank of Valletta</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                    You will continue to BOV to approve read-only access. Clankeep never receives your bank password or permission to make payments.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => startConnection()}
                    disabled={!overview.providerConfigured || Boolean(action)}
                  >
                    {action === 'connect' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Connect BOV
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">No accounts are shared yet</h2>
                  <p className="text-sm text-muted-foreground mt-2">The finance owner controls which accounts the household can view.</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {overview && overview.accounts.length > 0 && (
          <>
            {activeTab === 'overview' && <>
            <div className="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
              <Card className="bg-gradient-to-br from-brand-blue to-brand-purple text-white border-0">
                <CardContent className="p-6">
                  <p className="text-sm text-white/75">Total visible balance</p>
                  <div className="mt-3 space-y-1">
                    {overview.totals.map(total => (
                      <div key={total.currency} className="font-display text-3xl font-bold tabular-nums tracking-tight">
                        {currency(total.amount, total.currency)}
                      </div>
                    ))}
                    {!overview.totals.length && <div className="text-2xl font-semibold">Balance unavailable</div>}
                  </div>
                  <div className="mt-5 text-sm text-white/75 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> No payment access
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                {overview.accounts.map(account => (
                  <Card key={account.id} className="hover:-translate-y-0">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            {renamingAccount === account.id ? (
                              <div className="flex min-w-0 items-center gap-1">
                                <Input
                                  className="h-8 min-w-0"
                                  autoFocus
                                  value={accountName}
                                  onChange={event => setAccountName(event.target.value)}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') void renameAccount(account)
                                    if (event.key === 'Escape') setRenamingAccount(null)
                                  }}
                                  maxLength={80}
                                  aria-label="Friendly account name"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => renameAccount(account)} disabled={!accountName.trim() || action === `rename:${account.id}`}>
                                  {action === `rename:${account.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-green-700" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenamingAccount(null)}><X className="h-4 w-4" /></Button>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-semibold truncate">{account.displayName}</h3>
                                {account.canRename && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 shrink-0"
                                    aria-label={`Rename ${account.displayName}`}
                                    onClick={() => { setRenamingAccount(account.id); setAccountName(account.customName || account.displayName) }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {[account.maskedIdentifier, account.cashAccountType].filter(Boolean).join(' · ') || 'Bank of Valletta'}
                          </p>
                          {account.customName && <p className="mt-1 text-[11px] text-muted-foreground">Bank name: {account.providerDisplayName}</p>}
                        </div>
                        <Badge variant="outline" className={account.shared ? 'border-green-200 text-green-700' : ''}>
                          {account.shared ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                          {account.shared ? 'Shared' : 'Private'}
                        </Badge>
                      </div>
                      <div className="mt-5 font-display text-2xl font-bold tabular-nums">
                        {account.balance ? currency(account.balance.amount, account.balance.currency) : '—'}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{relativeSync(account.connection.lastSyncedAt, clock)}</span>
                        {overview.canManage && account.owned && (
                          <div className="flex items-center gap-1">
                            {account.customName && <Button size="sm" variant="ghost" disabled={Boolean(action)} onClick={() => renameAccount(account, true)}>Reset name</Button>}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={Boolean(action)}
                              onClick={() => changeSharing(account)}
                            >
                              {action === `share:${account.id}` && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              {account.shared ? 'Make private' : 'Share'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <FinanceInsightsPanel
              insights={insights}
              loading={insightsLoading}
              periodDays={insightDays}
              onPeriodChange={setInsightDays}
            />

            {overview.canManage && overview.connections.map(connection => {
              const tone = connectionTone(connection.status)
              const expiry = connection.consentExpiresAt ? new Date(connection.consentExpiresAt) : null
              const expiringSoon = expiry && expiry.getTime() - clock < 14 * 24 * 60 * 60_000
              return (
                <Card key={connection.id} className={connection.status === 'ACTIVE' ? '' : 'border-amber-200'}>
                  <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{connection.aspspName}</h3>
                          <Badge variant="outline" className={tone.className}>{tone.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>{relativeSync(connection.lastSyncedAt, clock)}</span>
                          {expiry && (
                            <span className={expiringSoon ? 'text-amber-700 font-medium' : ''}>
                              Consent until {friendlyDate(connection.consentExpiresAt)}
                            </span>
                          )}
                        </div>
                        {connection.syncError && <p className="text-sm text-red-700 mt-2">{connection.syncError}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(connection.status === 'REAUTH_REQUIRED' || connection.status === 'ERROR' || expiringSoon) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(action)}
                          onClick={() => startConnection(connection.id)}
                        >
                          {action === `reconnect:${connection.id}` && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Reconnect
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={Boolean(action)}
                        onClick={() => disconnect(connection)}
                      >
                        {action === `disconnect:${connection.id}` ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </>}

            {activeTab === 'statistics' && (
              <FinanceStatisticsPanel
                insights={insights}
                loading={insightsLoading}
                periodDays={insightDays}
                onPeriodChange={setInsightDays}
              />
            )}

            {activeTab === 'transactions' && <>
            <Card className="hover:-translate-y-0">
              <CardHeader>
                <CardTitle className="text-xl">Transaction activity</CardTitle>
                <CardDescription>Merchant-enriched BOV activity with account and date filters.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={searchInput}
                      onChange={event => setSearchInput(event.target.value)}
                      placeholder="Search merchant or description"
                    />
                  </div>
                  <select
                    className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                    value={accountFilter}
                    onChange={event => setAccountFilter(event.target.value)}
                    aria-label="Filter by account"
                  >
                    <option value="">All accounts</option>
                    {overview.accounts.map(account => <option key={account.id} value={account.id}>{account.displayName}</option>)}
                  </select>
                  <select
                    className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value)}
                    aria-label="Filter by status"
                  >
                    <option value="">All statuses</option>
                    <option value="BOOKED">Booked</option>
                    <option value="PENDING">Pending</option>
                  </select>
                  <Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label="From date" />
                  <Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label="To date" />
                </div>

                <div className="mt-5 divide-y divide-border">
                  {transactions.map(transaction => {
                    const amount = Number(transaction.amount)
                    const incoming = amount >= 0
                    return (
                      <div key={transaction.id} className="py-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${incoming ? 'bg-green-50 text-green-700' : 'bg-primary/10 text-primary'}`}>
                          {incoming ? <ArrowDownLeft className="w-4 h-4" /> : transaction.transactionType === 'Card purchase' ? <ReceiptText className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold truncate" title={transaction.merchantName}>{transaction.merchantName || transaction.counterparty || 'Bank transaction'}</p>
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {transaction.detail || transaction.transactionType}
                              </p>
                            </div>
                            <p className={`font-semibold whitespace-nowrap ${incoming ? 'text-green-700' : 'text-foreground'}`}>
                              {incoming ? '+' : ''}{currency(transaction.amount, transaction.currency)}
                            </p>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{friendlyDate(transaction.bookingDate || transaction.valueDate)}</span>
                            <span>{transaction.account.displayName}</span>
                            <Badge variant="outline" className="font-normal">{transaction.category}</Badge>
                            <span>{transaction.transactionType}</span>
                            {transaction.enrichmentSource !== 'local' && <Badge variant="outline" className="font-normal">{transaction.enrichmentSource === 'rule' ? 'Learned rule' : 'Edited'}</Badge>}
                            {transaction.status === 'PENDING' && <Badge variant="outline"><Clock3 className="w-3 h-3 mr-1" />Pending</Badge>}
                            {transaction.canEdit && <EditTransactionButton onClick={() => setEditingTransaction(transaction)} />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {!transactions.length && !transactionsLoading && (
                    <div className="py-12 text-center text-sm text-muted-foreground">No transactions match these filters.</div>
                  )}
                  {transactionsLoading && (
                    <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading activity…
                    </div>
                  )}
                </div>
                {nextCursor && !transactionsLoading && (
                  <div className="pt-5 flex justify-center">
                    <Button variant="outline" onClick={() => loadTransactions(true)}>Load more</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            {overview.canManage && (
              <FinanceRulesPanel
                householdId={householdId}
                reloadKey={rulesReload}
                onChanged={() => setTransactionReload(value => value + 1)}
                onError={setError}
                onNotice={setNotice}
              />
            )}
            </>}

            {activeTab === 'subscriptions' && (
              <FinanceSubscriptionsPanel
                householdId={householdId}
                accountId={accountFilter}
                accounts={overview.accounts.map(account => ({ id: account.id, displayName: account.displayName, currency: account.currency }))}
                canManage={overview.canManage}
                reloadKey={transactionReload}
                onError={setError}
                onNotice={setNotice}
              />
            )}

            {activeTab === 'coach' && (
              <FinanceCoachPanel
                householdId={householdId}
                accountId={accountFilter}
                accounts={overview.accounts.map(account => ({ id: account.id, displayName: account.displayName, currency: account.currency }))}
                canManage={overview.canManage}
                reloadKey={transactionReload}
                onError={setError}
                onNotice={setNotice}
              />
            )}
          </>
        )}

        <FinanceTransactionEditor
          householdId={householdId}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={() => { setTransactionReload(value => value + 1); setRulesReload(value => value + 1) }}
          onError={setError}
          onNotice={setNotice}
        />
      </div>
    </ModernAppShell>
  )
}
