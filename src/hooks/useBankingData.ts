/**
 * Data and mutations for the banking pages.
 *
 * All of this used to live inline in a 921-line page component alongside the
 * markup, which is why the same fetch-and-set-error pattern appeared eight times
 * with small differences. The page now composes; these hooks own the talking.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Account, Connection, Overview } from '@/components/banking/types'
import type { BankingAnalytics, CurrencyAnalytics } from '@/lib/finance/analytics-types'

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useHouseholdId(): { householdId: string; loading: boolean; error: string | null } {
  const { status } = useSession()
  const [householdId, setHouseholdId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false)
      return
    }
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/household/active')
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || 'Unable to load household')
        if (!active) return
        setHouseholdId(typeof payload?.householdId === 'string' ? payload.householdId : '')
      } catch (loadError) {
        if (active) setError(messageFrom(loadError, 'Unable to load household'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [status])

  return { householdId, loading, error }
}

export type BankingOverview = {
  overview: Overview | null
  loading: boolean
  upgradeRequired: boolean
  error: string | null
  notice: string | null
  action: string | null
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
  reload: () => Promise<void>
  syncConnection: (connectionId: string, automatic?: boolean) => Promise<void>
  startConnection: (connectionId?: string) => Promise<void>
  changeSharing: (account: Account) => Promise<void>
  renameAccount: (account: Account, customName: string | null) => Promise<void>
  disconnect: (connection: Connection) => Promise<void>
  /** Bumped whenever data changes, so dependent panels can refetch. */
  reloadKey: number
}

export function useBankingOverview(householdId: string, enabled = true): BankingOverview {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const autoSynced = useRef(new Set<string>())

  const reload = useCallback(async () => {
    if (!householdId) return
    const response = await fetch(`/api/finance/overview?householdId=${encodeURIComponent(householdId)}`)
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
  }, [householdId])

  useEffect(() => {
    if (!enabled) return
    if (!householdId) {
      setLoading(false)
      return
    }
    let active = true
    void (async () => {
      try {
        await reload()
      } catch (loadError) {
        if (active) {
          setError(messageFrom(loadError, 'Unable to load finances'))
          setLoading(false)
        }
      }
    })()
    return () => { active = false }
  }, [enabled, householdId, reload])

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
      await reload()
      setReloadKey(value => value + 1)
      if (!automatic) setNotice('Bank data refreshed.')
    } catch (syncError) {
      if (!automatic) setError(messageFrom(syncError, 'Bank sync failed'))
      await reload().catch(() => undefined)
    } finally {
      setAction(null)
    }
  }, [householdId, reload])

  // Banks cap unattended access to a few calls per account per day, and one sync
  // uses several of them. Auto-sync once a day and leave the rest of the budget
  // for the household's own Refresh presses.
  useEffect(() => {
    if (!overview?.canManage) return
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    for (const connection of overview.connections) {
      const stale = !connection.lastSyncedAt
        || new Date(connection.lastSyncedAt).getTime() < startOfToday.getTime()
      if (connection.status === 'ACTIVE' && stale && !autoSynced.current.has(connection.id)) {
        autoSynced.current.add(connection.id)
        void syncConnection(connection.id, true)
      }
    }
  }, [overview, syncConnection])

  const startConnection = useCallback(async (connectionId?: string) => {
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
      setError(messageFrom(connectionError, 'Unable to start bank connection'))
      setAction(null)
    }
  }, [householdId])

  const changeSharing = useCallback(async (account: Account) => {
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
      await reload()
      setNotice(account.shared ? 'Account is now private.' : 'Account is now visible to your household.')
    } catch (shareError) {
      setError(messageFrom(shareError, 'Unable to change sharing'))
    } finally {
      setAction(null)
    }
  }, [householdId, reload])

  const renameAccount = useCallback(async (account: Account, customName: string | null) => {
    if (!householdId) return
    setAction(`rename:${account.id}`)
    setError(null)
    try {
      const response = await fetch(`/api/finance/accounts/${encodeURIComponent(account.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, customName }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to rename account')
      await reload()
      setReloadKey(value => value + 1)
      setNotice(customName ? 'Friendly account name saved.' : 'Account name reset to the bank name.')
    } catch (renameError) {
      setError(messageFrom(renameError, 'Unable to rename account'))
    } finally {
      setAction(null)
    }
  }, [householdId, reload])

  const disconnect = useCallback(async (connection: Connection) => {
    if (!householdId) return
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
      await reload()
      setReloadKey(value => value + 1)
      setNotice('Bank disconnected and imported data deleted.')
    } catch (disconnectError) {
      setError(messageFrom(disconnectError, 'Unable to disconnect bank'))
    } finally {
      setAction(null)
    }
  }, [householdId, reload])

  return {
    overview,
    loading,
    upgradeRequired,
    error,
    notice,
    action,
    setError,
    setNotice,
    reload,
    syncConnection,
    startConnection,
    changeSharing,
    renameAccount,
    disconnect,
    reloadKey,
  }
}

export type BankingAnalyticsState = {
  data: BankingAnalytics | null
  active: CurrencyAnalytics | null
  loading: boolean
  error: string | null
}

export function useBankingAnalytics(params: {
  householdId: string
  days: number
  accountId?: string
  currency?: string
  enabled?: boolean
  reloadKey?: number
}): BankingAnalyticsState {
  const { householdId, days, accountId, currency, enabled = true, reloadKey = 0 } = params
  const [data, setData] = useState<BankingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !householdId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void (async () => {
      try {
        const query = new URLSearchParams({ householdId, days: String(days) })
        if (accountId) query.set('accountId', accountId)
        const response = await fetch(`/api/finance/analytics?${query.toString()}`, { signal: controller.signal })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || 'Unable to load banking analytics')
        setData(payload as BankingAnalytics)
        setError(null)
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(messageFrom(loadError, 'Unable to load banking analytics'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [accountId, days, enabled, householdId, reloadKey])

  const requested = currency?.toUpperCase()
  const active = data
    ? data.currencies.find(entry => entry.currency === (requested || data.primaryCurrency)) ?? data.currencies[0] ?? null
    : null

  return { data, active, loading, error }
}
