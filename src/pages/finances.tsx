import React, { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, Loader2, PiggyBank, ShieldCheck, Sparkles, Target, Wallet, WalletCards } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import UpgradeGate from '@/components/UpgradeGate'
import PlannerPanel from '@/components/finance/PlannerPanel'
import PlannerGoalsPanel from '@/components/finance/PlannerGoalsPanel'
import PlannerCoachPanel from '@/components/finance/PlannerCoachPanel'
import SavingsPanel from '@/components/finance/SavingsPanel'
import type { PlannerData } from '@/components/finance/planner-types'
import { Card, CardContent } from '@/components/ui/Card'

type FinanceTab = 'plan' | 'savings' | 'goals' | 'coach'

export default function FinancesPage() {
  const { status } = useSession()
  const [householdId, setHouseholdId] = useState('')
  const [planner, setPlanner] = useState<PlannerData | null>(null)
  const [activeTab, setActiveTab] = useState<FinanceTab>('plan')
  const [loading, setLoading] = useState(true)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `background` refreshes in place after an edit; the full-page spinner is only for first load.
  const loadPlanner = useCallback(async (id: string, background = false) => {
    if (!background) setLoading(true)
    try {
      const response = await fetch(`/api/finance/planner?householdId=${encodeURIComponent(id)}`)
      const payload = await response.json().catch(() => null)
      if (response.status === 403 && payload?.code === 'upgrade_required') {
        setUpgradeRequired(true)
        return
      }
      if (!response.ok) throw new Error(payload?.error || 'Unable to load the household plan')
      setUpgradeRequired(false)
      setPlanner(payload as PlannerData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the household plan')
    } finally {
      setLoading(false)
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
        if (id) await loadPlanner(id)
        else setLoading(false)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load finances')
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [loadPlanner, status])

  if (loading || status === 'loading') {
    return (
      <ModernAppShell title="Finance">
        <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground">
          <div><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />Loading your finances…</div>
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
            title="Plan the household’s money in one calm view"
            description="The Family plan adds a private money planner for income, commitments, goals, and optional AI coaching."
            bullets={['Income and commitments in one view', 'Savings goals with progress', 'No bank login needed']}
          />
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Finance">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" /> Private household planning
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Plan your household money</h1>
          <p className="mt-1 text-muted-foreground">Keep income, commitments, and savings goals together without connecting a bank.</p>
        </div>

        {error && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span>
          </div>
        )}

        {householdId && (
          <nav className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-2 sm:flex sm:w-fit" aria-label="Finance sections">
            {([
              ['plan', 'My plan', Wallet],
              ['savings', 'Savings', PiggyBank],
              ['goals', 'Goals', Target],
              ['coach', 'AI coach', Sparkles],
            ] as const).map(([id, label, Icon]) => (
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
        )}

        {!householdId && (
          <Card>
            <CardContent className="py-12 text-center">
              <WalletCards className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Create or join a household first</h2>
              <p className="mt-1 text-sm text-muted-foreground">Finance planning follows your active household.</p>
            </CardContent>
          </Card>
        )}

        {householdId && planner && activeTab === 'plan' && (
          <PlannerPanel householdId={householdId} data={planner} onChanged={() => void loadPlanner(householdId, true)} onError={setError} />
        )}
        {householdId && planner && activeTab === 'savings' && (
          <SavingsPanel
            householdId={householdId}
            data={planner}
            onChanged={() => void loadPlanner(householdId, true)}
            onError={setError}
          />
        )}
        {householdId && planner && activeTab === 'goals' && (
          <PlannerGoalsPanel householdId={householdId} data={planner} onChanged={() => void loadPlanner(householdId, true)} onError={setError} />
        )}
        {householdId && planner && activeTab === 'coach' && (
          <PlannerCoachPanel householdId={householdId} data={planner} onError={setError} />
        )}
      </div>
    </ModernAppShell>
  )
}
