import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { shoppingCategoryLabel } from '@/lib/shopping-categories'
import type { ShoppingAiOperation, ShoppingAiPreviewResponse, ShoppingAiProposalResponse } from '@/lib/shopping-ai-types'

function mondayToday(): string {
  const today = new Date()
  const day = today.getDay() || 7
  today.setDate(today.getDate() - day + 1)
  return today.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function operationTitle(operation: ShoppingAiOperation): string {
  if (operation.kind === 'add') return `Add ${operation.after.title}`
  if (operation.kind === 'merge') return `Merge ${operation.before.map(item => item.title).join(' + ')}`
  if (operation.before.title !== operation.after.title) return `Rename ${operation.before.title} to ${operation.after.title}`
  return `Move ${operation.after.title} to ${shoppingCategoryLabel(operation.after.category)}`
}

export function ShoppingAiDialog({ listId, listName, open, onOpenChange, onApplied }: {
  listId: string
  listName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: () => Promise<void> | void
}) {
  const [stage, setStage] = useState<'context' | 'preview' | 'proposal'>('context')
  const [includeMeals, setIncludeMeals] = useState(false)
  const [weekStart, setWeekStart] = useState(mondayToday())
  const [preview, setPreview] = useState<ShoppingAiPreviewResponse | null>(null)
  const [proposal, setProposal] = useState<ShoppingAiProposalResponse | null>(null)
  const [consent, setConsent] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const context = useMemo(() => includeMeals ? { from: weekStart, to: addDays(weekStart, 6) } : {}, [includeMeals, weekStart])

  useEffect(() => {
    if (!open) return
    setStage('context'); setIncludeMeals(false); setWeekStart(mondayToday()); setPreview(null); setProposal(null); setConsent(false); setSelected([]); setError('')
  }, [open, listId])

  const loadPreview = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/shopping/ai/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listId, ...context }) })
      const data = await response.json().catch(() => ({})) as ShoppingAiPreviewResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not prepare the AI privacy preview')
      setPreview(data); setStage('preview')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not prepare the AI privacy preview') }
    finally { setBusy(false) }
  }

  const generate = async () => {
    if (!preview || !consent) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/shopping/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listId, ...context, inputHash: preview.inputHash, consent: true }) })
      const data = await response.json().catch(() => ({})) as ShoppingAiProposalResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not tidy this list')
      setProposal(data)
      setSelected(data.operations.filter(operation => operation.kind !== 'add').map(operation => operation.id))
      setStage('proposal')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not tidy this list') }
    finally { setBusy(false) }
  }

  const apply = async () => {
    if (!proposal || !selected.length) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/shopping/ai/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalToken: proposal.proposalToken, operationIds: selected }) })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not apply the selected changes')
      await onApplied(); onOpenChange(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not apply the selected changes') }
    finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-module-shopping" />Tidy {listName} with AI</DialogTitle>
        <DialogDescription>AI proposes changes only. You decide which ones are applied.</DialogDescription>
      </DialogHeader>

      {stage === 'context' && <div className="space-y-4">
        <div className="rounded-lg border p-4"><p className="font-medium">Current active list</p><p className="mt-1 text-sm text-muted-foreground">Item names, quantities, counts and existing categories will be included.</p></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
          <input type="checkbox" checked={includeMeals} onChange={event => setIncludeMeals(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          <span><span className="block font-medium">Check a selected meal-plan week</span><span className="mt-1 block text-sm text-muted-foreground">AI may propose only recipe ingredients from this week that are missing from the list.</span></span>
        </label>
        {includeMeals && <label className="block text-sm font-medium">Week starting<Input type="date" value={weekStart} onChange={event => setWeekStart(event.target.value)} className="mt-2 h-11" /></label>}
      </div>}

      {stage === 'preview' && preview && <div className="space-y-4">
        {!preview.configured && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">AI is not configured on this deployment. Your list continues to work without it.</p>}
        <div className="rounded-lg bg-secondary p-4 text-sm"><p className="font-semibold">Exactly what will leave Clankeep</p><p className="mt-1 text-muted-foreground">No names of people, completed history, retailer data, catalogue links or prices are included.</p></div>
        <details className="rounded-lg border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">View exact JSON payload</summary><pre className="max-h-72 overflow-auto border-t bg-muted/40 p-4 text-xs whitespace-pre-wrap">{JSON.stringify(preview.payload, null, 2)}</pre></details>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span className="text-sm">I consent to sending this exact payload to DeepSeek for this tidy request.</span></label>
      </div>}

      {stage === 'proposal' && proposal && <div className="space-y-4">
        <p className="rounded-lg bg-secondary p-4 text-sm">{proposal.summary}</p>
        {proposal.operations.length === 0 ? <p className="rounded-lg border p-5 text-center text-sm">This list already looks tidy. No changes were proposed.</p> : <div className="space-y-2">
          {proposal.operations.map(operation => <label key={operation.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input type="checkbox" checked={selected.includes(operation.id)} onChange={event => setSelected(current => event.target.checked ? [...current, operation.id] : current.filter(id => id !== operation.id))} className="mt-1 h-4 w-4 accent-primary" />
            <span className="min-w-0"><span className="block text-sm font-semibold">{operationTitle(operation)}</span><span className="mt-1 block text-xs text-muted-foreground">{operation.reason} · {shoppingCategoryLabel(operation.after.category)}</span></span>
          </label>)}
        </div>}
      </div>}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        {stage !== 'context' && <Button type="button" variant="outline" disabled={busy} onClick={() => { setError(''); setStage(stage === 'proposal' ? 'preview' : 'context') }}>Back</Button>}
        <Button type="button" variant={stage === 'proposal' && !proposal?.operations.length ? 'outline' : 'default'} disabled={busy || (stage === 'preview' && (!consent || !preview?.configured)) || (stage === 'proposal' && Boolean(proposal?.operations.length) && !selected.length)} onClick={() => stage === 'context' ? void loadPreview() : stage === 'preview' ? void generate() : proposal?.operations.length ? void apply() : onOpenChange(false)}>
          {busy && <Loader2 className="animate-spin" />}{stage === 'context' ? 'Review AI data' : stage === 'preview' ? 'Generate suggestions' : proposal?.operations.length ? `Apply ${selected.length} changes` : 'Close'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
