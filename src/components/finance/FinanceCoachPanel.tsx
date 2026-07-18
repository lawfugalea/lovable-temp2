import { useCallback, useEffect, useState } from 'react'
import { BrainCircuit, ChevronRight, Eye, Gauge, Loader2, Plus, ShieldCheck, Sparkles, Target, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FINANCE_CATEGORIES } from '@/lib/finance/enrichment'

type AccountOption = { id: string; displayName: string; currency: string }
type Signal = { key: string; kind: string; title: string; explanation: string; suggestion: string; currency: string; currentValue: number; previousValue: number | null; percentageChange: number | null; transactionIds: string[] }
type Limit = { id: string; accountId: string | null; scope: string; displayName: string; amount: number; currency: string; spent: number; percentage: number; projected: number; exceeded: boolean }
type AiResult = { summary: string; observations: Array<{ title: string; explanation: string; suggestion: string; confidence: number | null }> }
type Props = { householdId: string; accountId: string; accounts: AccountOption[]; canManage: boolean; reloadKey: number; onError: (message: string) => void; onNotice: (message: string) => void }

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency }).format(amount)
}

function signalLabel(kind: string): string {
  return ({ SPEND_TREND: 'Spending trend', FREQUENCY: 'Frequency', SMALL_PURCHASES: 'Small purchases', CONCENTRATION: 'Concentration' } as Record<string, string>)[kind] || 'Pattern'
}

export default function FinanceCoachPanel({ householdId, accountId, accounts, canManage, reloadKey, onError, onNotice }: Props) {
  const [signals, setSignals] = useState<Signal[]>([])
  const [limits, setLimits] = useState<Limit[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [showLimit, setShowLimit] = useState(false)
  const [limitForm, setLimitForm] = useState({ accountId: accountId || '', scope: 'CATEGORY', displayName: 'Dining', amount: '', currency: 'EUR' })
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiCreatedAt, setAiCreatedAt] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ configured: boolean; consented: boolean; payload: unknown } | null>(null)
  const [consent, setConsent] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ householdId })
      if (accountId) query.set('accountId', accountId)
      const [coachResponse, aiResponse] = await Promise.all([
        fetch(`/api/finance/coach?${query}`),
        fetch(`/api/finance/ai/latest?householdId=${encodeURIComponent(householdId)}`),
      ])
      const coach = await coachResponse.json().catch(() => null)
      const ai = await aiResponse.json().catch(() => null)
      if (!coachResponse.ok) throw new Error(coach?.error || 'Unable to load spending coach')
      setSignals(coach.signals || [])
      setLimits(coach.limits || [])
      if (aiResponse.ok) { setAiResult(ai.analysis || null); setAiCreatedAt(ai.createdAt || null) }
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to load spending coach') }
    finally { setLoading(false) }
  }, [accountId, householdId, onError])

  useEffect(() => { void load() }, [load, reloadKey])

  const addLimit = async () => {
    setAction('limit')
    try {
      const response = await fetch('/api/finance/coach/limits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId, ...limitForm, accountId: limitForm.accountId || null }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to add spending limit')
      setShowLimit(false); setLimitForm({ accountId: accountId || '', scope: 'CATEGORY', displayName: 'Dining', amount: '', currency: 'EUR' })
      await load(); onNotice('Monthly spending limit added.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to add spending limit') }
    finally { setAction('') }
  }

  const deleteLimit = async (id: string) => {
    setAction(`delete:${id}`)
    try {
      const response = await fetch(`/api/finance/coach/limits/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete limit')
      await load(); onNotice('Spending limit removed.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to delete limit') }
    finally { setAction('') }
  }

  const feedback = async (signalKey: string, state: 'DISMISSED' | 'SNOOZED') => {
    setAction(`${state}:${signalKey}`)
    try {
      const response = await fetch('/api/finance/coach/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId, signalKey, state, days: 30 }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update this insight')
      setSignals(current => current.filter(signal => signal.key !== signalKey))
      onNotice(state === 'SNOOZED' ? 'Insight snoozed for 30 days.' : 'Insight dismissed.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to update this insight') }
    finally { setAction('') }
  }

  const openAiPreview = async () => {
    setAction('preview')
    try {
      const query = new URLSearchParams({ householdId }); if (accountId) query.set('accountId', accountId)
      const response = await fetch(`/api/finance/ai/preview?${query}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to prepare AI preview')
      setPreview(payload); setConsent(Boolean(payload.consented))
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to prepare AI preview') }
    finally { setAction('') }
  }

  const runAi = async () => {
    if (!preview || (!preview.consented && !consent)) return
    setAction('analyze')
    try {
      const response = await fetch('/api/finance/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId, accountId: accountId || null, consent }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'AI analysis failed')
      setAiResult(payload.analysis); setAiCreatedAt(payload.createdAt); setPreview(null)
      onNotice(payload.cached ? 'Showing the latest matching AI analysis.' : 'Redacted AI analysis completed.')
    } catch (error) { onError(error instanceof Error ? error.message : 'AI analysis failed') }
    finally { setAction('') }
  }

  const revokeAi = async () => {
    setAction('revoke')
    try {
      const response = await fetch('/api/finance/ai/consent', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to revoke AI consent')
      setAiResult(null); setPreview(null); onNotice('AI consent and cached analyses were deleted.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to revoke AI consent') }
    finally { setAction('') }
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-cozy-primary"><BrainCircuit className="h-4 w-4" /> Local pattern recognition</div><h2 className="mt-1 text-2xl font-bold">Spending coach</h2><p className="mt-1 text-sm text-cozy-text-muted">Neutral, explainable observations — never a judgement or financial advice.</p></div>{canManage && <div className="flex gap-2"><Button variant="outline" onClick={() => setShowLimit(value => !value)}><Target className="mr-2 h-4 w-4" />Set a limit</Button><Button onClick={openAiPreview} disabled={action === 'preview'}>{action === 'preview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Improve with AI</Button></div>}</div>

    {showLimit && <Card className="hover:-translate-y-0"><CardHeader><CardTitle className="text-lg">New monthly limit</CardTitle><CardDescription>Track a category or one merchant across all accounts, or select a specific account.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="h-10 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={limitForm.accountId} onChange={event => setLimitForm({ ...limitForm, accountId: event.target.value })}><option value="">All accounts</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select><select className="h-10 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={limitForm.scope} onChange={event => setLimitForm({ ...limitForm, scope: event.target.value, displayName: event.target.value === 'CATEGORY' ? 'Dining' : '' })}><option value="CATEGORY">Category</option><option value="MERCHANT">Merchant</option></select>{limitForm.scope === 'CATEGORY' ? <select className="h-10 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={limitForm.displayName} onChange={event => setLimitForm({ ...limitForm, displayName: event.target.value })}>{FINANCE_CATEGORIES.filter(item => !['Income', 'Refunds', 'Transfers'].includes(item)).map(item => <option key={item}>{item}</option>)}</select> : <Input placeholder="Merchant name" value={limitForm.displayName} onChange={event => setLimitForm({ ...limitForm, displayName: event.target.value })} />}<Input type="number" min="1" step="1" placeholder="Monthly amount" value={limitForm.amount} onChange={event => setLimitForm({ ...limitForm, amount: event.target.value })} /><Button onClick={addLimit} disabled={!limitForm.displayName || !limitForm.amount || action === 'limit'}>{action === 'limit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add limit</Button></CardContent></Card>}

    {limits.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{limits.map(limit => <Card key={limit.id} className={`hover:-translate-y-0 ${limit.exceeded ? 'border-red-200' : ''}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-cozy-primary" /><h3 className="font-semibold">{limit.displayName}</h3><Badge variant="outline">Monthly</Badge></div><p className="mt-1 text-xs text-cozy-text-muted">{money(limit.spent, limit.currency)} of {money(limit.amount, limit.currency)} · projected {money(limit.projected, limit.currency)}</p></div>{canManage && <Button size="icon" variant="ghost" aria-label="Delete limit" onClick={() => deleteLimit(limit.id)} disabled={action === `delete:${limit.id}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>}</div><div className="mt-4 h-3 overflow-hidden rounded-full bg-cozy-gray-100"><div className={`h-full rounded-full ${limit.exceeded ? 'bg-red-500' : limit.percentage >= 80 ? 'bg-amber-500' : 'bg-cozy-primary'}`} style={{ width: `${Math.min(100, Math.max(2, limit.percentage))}%` }} /></div><p className={`mt-2 text-sm font-medium ${limit.exceeded ? 'text-red-700' : 'text-cozy-text'}`}>{limit.percentage.toFixed(0)}% used{limit.exceeded ? ' · limit exceeded' : ''}</p></CardContent></Card>)}</div>}

    <div><h3 className="text-lg font-semibold">Patterns worth a look</h3><p className="text-sm text-cozy-text-muted">Bills, transfers, cash, income, and confirmed subscriptions are excluded by default.</p></div>
    {loading ? <Card><CardContent className="flex min-h-48 items-center justify-center text-sm text-cozy-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Building local patterns…</CardContent></Card> : signals.length === 0 ? <Card><CardContent className="py-12 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-cozy-primary" /><p className="font-medium">No notable discretionary patterns right now</p><p className="mt-1 text-sm text-cozy-text-muted">This is not a score. New observations appear only when a clear threshold is crossed.</p></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{signals.map(signal => <Card key={signal.key} className="hover:-translate-y-0"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><Badge variant="outline">{signalLabel(signal.kind)}</Badge><span className="text-xs text-cozy-text-muted">{signal.transactionIds.length} matching transactions</span></div><h3 className="mt-3 font-semibold">{signal.title}</h3><p className="mt-2 text-sm text-cozy-text-muted">{signal.explanation}</p><div className="mt-3 flex gap-2 rounded-lg bg-cozy-primary-soft/60 p-3 text-sm text-cozy-text"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cozy-primary" />{signal.suggestion}</div>{canManage && <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => feedback(signal.key, 'SNOOZED')}>Snooze 30 days</Button><Button size="sm" variant="ghost" onClick={() => feedback(signal.key, 'DISMISSED')}>Dismiss</Button></div>}</CardContent></Card>)}</div>}

    {(aiResult || canManage) && <Card className="overflow-hidden border-violet-200 hover:-translate-y-0"><CardHeader className="bg-gradient-to-r from-violet-50 to-blue-50"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-700" /><CardTitle className="text-lg">Optional AI perspective</CardTitle></div><CardDescription>Suggestions from redacted aggregates; local analysis remains authoritative.</CardDescription></div>{canManage && aiResult && <Button size="sm" variant="ghost" onClick={revokeAi}>Delete & revoke</Button>}</div></CardHeader><CardContent className="p-5">{aiResult ? <><p className="text-sm font-medium">{aiResult.summary}</p><div className="mt-4 grid gap-3 md:grid-cols-2">{aiResult.observations.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl border border-cozy-gray-200 p-4"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold">{item.title}</h4>{item.confidence !== null && <Badge variant="outline">{Math.round(item.confidence * 100)}%</Badge>}</div><p className="mt-2 text-sm text-cozy-text-muted">{item.explanation}</p><p className="mt-3 text-sm text-cozy-text">{item.suggestion}</p></div>)}</div>{aiCreatedAt && <p className="mt-4 text-xs text-cozy-text-muted">Generated {new Intl.DateTimeFormat('en-MT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(aiCreatedAt))}</p>}</> : <div className="text-center py-4"><Eye className="mx-auto mb-2 h-7 w-7 text-cozy-text-muted" /><p className="font-medium">No AI analysis has been requested</p><p className="mt-1 text-sm text-cozy-text-muted">Nothing leaves Clankeep unless the finance owner previews and sends it.</p></div>}</CardContent></Card>}

    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true"><Card className="max-h-[90vh] w-full max-w-3xl overflow-auto hover:-translate-y-0"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Review what DeepSeek will receive</CardTitle><CardDescription>No account IDs, exact dates, BOV notes, references, or personal identity are included.</CardDescription></div><Button size="icon" variant="ghost" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent><div className={`rounded-lg border p-3 text-sm ${preview.configured ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{preview.configured ? 'DeepSeek is configured on the server.' : 'Add DEEPSEEK_API_KEY to the server before requesting analysis.'}</div><pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(preview.payload, null, 2)}</pre>{!preview.consented && <label className="mt-4 flex items-start gap-3 rounded-lg border border-cozy-gray-200 p-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I explicitly consent to sending this redacted payload to DeepSeek for this optional analysis. I understand DeepSeek states that data is processed in China and may be used to improve its services.</span></label>}<div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button><Button onClick={runAi} disabled={!preview.configured || (!preview.consented && !consent) || action === 'analyze'}>{action === 'analyze' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Send redacted analysis</Button></div></CardContent></Card></div>}
  </section>
}
