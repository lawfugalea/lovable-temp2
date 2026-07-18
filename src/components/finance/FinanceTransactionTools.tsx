import { useCallback, useEffect, useState } from 'react'
import { Edit3, Loader2, Power, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FINANCE_CATEGORIES } from '@/lib/finance/enrichment'

export type EditableFinanceTransaction = {
  id: string
  account: { id: string; displayName: string }
  merchantName: string
  originalMerchantName?: string
  category: string
  originalCategory?: string
  enrichmentSource?: 'local' | 'rule' | 'override'
}

type EditorProps = {
  householdId: string
  transaction: EditableFinanceTransaction | null
  onClose: () => void
  onSaved: () => void
  onError: (message: string) => void
  onNotice: (message: string) => void
}

export function FinanceTransactionEditor({ householdId, transaction, onClose, onSaved, onError, onNotice }: EditorProps) {
  const [merchantName, setMerchantName] = useState('')
  const [category, setCategory] = useState('Other')
  const [applyToSimilar, setApplyToSimilar] = useState(true)
  const [allAccounts, setAllAccounts] = useState(false)
  const [matchType, setMatchType] = useState<'EXACT' | 'CONTAINS'>('EXACT')
  const [preview, setPreview] = useState<{ count: number; matchValue: string; samples: Array<{ id: string; merchantName: string }> } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!transaction) return
    setMerchantName(transaction.merchantName)
    setCategory(transaction.category)
    setApplyToSimilar(true)
    setAllAccounts(false)
    setMatchType('EXACT')
  }, [transaction])

  useEffect(() => {
    if (!transaction || !applyToSimilar) { setPreview(null); return }
    let active = true
    setLoading(true)
    fetch('/api/finance/rules/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId, transactionId: transaction.id, matchType, allAccounts }),
    }).then(async response => {
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to preview matching transactions')
      if (active) setPreview(payload)
    }).catch(error => { if (active) onError(error instanceof Error ? error.message : 'Unable to preview matching transactions') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [allAccounts, applyToSimilar, householdId, matchType, onError, transaction])

  if (!transaction) return null

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/finance/transactions/${encodeURIComponent(transaction.id)}/correction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, merchantName, category, applyToSimilar, allAccounts, matchType, matchValue: preview?.matchValue }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to save correction')
      onNotice(applyToSimilar ? `Rule saved for ${preview?.count || 1} matching transactions and future activity.` : 'Transaction correction saved.')
      onSaved(); onClose()
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to save correction') }
    finally { setSaving(false) }
  }

  const resetOverride = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/finance/transactions/${encodeURIComponent(transaction.id)}/correction`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to reset correction')
      onNotice('Single-transaction correction removed.'); onSaved(); onClose()
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to reset correction') }
    finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true"><Card className="max-h-[90vh] w-full max-w-xl overflow-auto hover:-translate-y-0"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Improve this transaction</CardTitle><CardDescription>Correct the merchant or category and optionally teach Clankeep the pattern.</CardDescription></div><Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-4"><div><label className="mb-1.5 block text-sm font-medium">Friendly merchant name</label><Input value={merchantName} onChange={event => setMerchantName(event.target.value)} maxLength={160} /></div><div><label className="mb-1.5 block text-sm font-medium">Category</label><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={category} onChange={event => setCategory(event.target.value)}>{FINANCE_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></div><label className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" className="mt-1" checked={applyToSimilar} onChange={event => setApplyToSimilar(event.target.checked)} /><span><span className="block text-sm font-medium">Apply to matching transactions</span><span className="block text-xs text-muted-foreground">Creates a reusable local rule for past and future activity.</span></span></label>{applyToSimilar && <div className="space-y-3 rounded-xl bg-background/60 p-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-medium">Match style</label><select className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm" value={matchType} onChange={event => setMatchType(event.target.value as 'EXACT' | 'CONTAINS')}><option value="EXACT">Same normalized merchant</option><option value="CONTAINS">Merchant contains pattern</option></select></div><label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={allAccounts} onChange={event => setAllAccounts(event.target.checked)} />Use on all my accounts</label></div><div className="text-sm">{loading ? <span className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking matches…</span> : <><strong>{preview?.count || 0}</strong> transaction{preview?.count === 1 ? '' : 's'} match this pattern.{preview?.samples?.length ? <p className="mt-1 truncate text-xs text-muted-foreground">Examples: {[...new Set(preview.samples.map(item => item.merchantName))].slice(0, 3).join(', ')}</p> : null}</>}</div></div>}<div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4"><div>{transaction.enrichmentSource === 'override' && <Button variant="ghost" onClick={resetOverride} disabled={saving}><RotateCcw className="mr-2 h-4 w-4" />Reset single edit</Button>}</div><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!merchantName.trim() || saving || (applyToSimilar && loading)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></div></div></CardContent></Card></div>
}

type Rule = { id: string; matchType: string; matchValue: string; merchantName: string | null; category: string | null; enabled: boolean; account: { displayName: string } | null }
type RulesProps = { householdId: string; reloadKey: number; onChanged: () => void; onError: (message: string) => void; onNotice: (message: string) => void }

export function FinanceRulesPanel({ householdId, reloadKey, onChanged, onError, onNotice }: RulesProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/rules?householdId=${encodeURIComponent(householdId)}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load learned rules')
      setRules(payload.rules || [])
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to load learned rules') }
    finally { setLoading(false) }
  }, [householdId, onError])
  useEffect(() => { if (open) void load() }, [load, open, reloadKey])

  const mutate = async (rule: Rule, method: 'PATCH' | 'DELETE', changes: Record<string, unknown> = {}) => {
    try {
      const response = await fetch(`/api/finance/rules/${encodeURIComponent(rule.id)}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId, ...changes }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update learned rule')
      await load(); onChanged(); onNotice(method === 'DELETE' ? 'Learned rule deleted.' : 'Learned rule updated.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to update learned rule') }
  }

  return <Card className="hover:-translate-y-0"><CardHeader><button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(value => !value)}><div><div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Learned merchant rules</CardTitle></div><CardDescription>Review the corrections Clankeep applies locally.</CardDescription></div><Badge variant="outline">{open ? 'Hide' : 'Manage'}</Badge></button></CardHeader>{open && <CardContent>{loading ? <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading rules…</div> : rules.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No learned rules yet. Use the edit button on a transaction to create one.</p> : <div className="divide-y divide-border">{rules.map(rule => <div key={rule.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{rule.merchantName || rule.matchValue}</p>{rule.category && <Badge variant="outline">{rule.category}</Badge>}{!rule.enabled && <Badge variant="outline">Paused</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{rule.matchType === 'EXACT' ? 'Exact normalized match' : 'Contains'}: “{rule.matchValue}” · {rule.account?.displayName || 'All accounts'}</p></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => mutate(rule, 'PATCH', { enabled: !rule.enabled })}><Power className="mr-1 h-3 w-3" />{rule.enabled ? 'Pause' : 'Enable'}</Button><Button size="icon" variant="ghost" aria-label="Delete rule" onClick={() => mutate(rule, 'DELETE')}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>)}</div>}</CardContent>}</Card>
}

export function EditTransactionButton({ onClick }: { onClick: () => void }) {
  return <Button size="sm" variant="ghost" onClick={onClick}><Edit3 className="mr-1 h-3 w-3" />Edit</Button>
}
