import React, { useState } from 'react'
import { CalendarDays, Loader2, Pencil, PiggyBank, Plus, ShieldPlus, Target, Trash2 } from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { GoalPlan } from '@/lib/budget'
import { euros, type PlannerData } from './planner-types'

interface PlannerGoalsPanelProps {
  householdId: string
  data: PlannerData
  onChanged: () => void
  onError: (message: string) => void
}

type GoalDraft = { id?: string; name: string; target: string; saved: string; targetDate: string }

const emptyGoal: GoalDraft = { name: '', target: '', saved: '', targetDate: '' }

export default function PlannerGoalsPanel({ householdId, data, onChanged, onError }: PlannerGoalsPanelProps) {
  const [draft, setDraft] = useState<GoalDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()

  const hasEmergencyFund = data.goals.some(goal => /emergency/i.test(goal.name))

  const submit = async (body: Record<string, unknown>, method: string) => {
    setBusy(true)
    try {
      const response = await fetch('/api/finance/planner/goals', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...body }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Could not save the goal')
      setDraft(null)
      onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save the goal')
    } finally {
      setBusy(false)
    }
  }

  const createEmergencyFund = () => {
    void submit(
      {
        name: 'Emergency fund',
        target: (data.suggestedEmergencyFundCents / 100).toFixed(2),
        saved: '',
        targetDate: '',
      },
      'POST',
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Savings goals</h2>
          <p className="text-sm text-muted-foreground">
            {data.summary.disposableCents > 0
              ? `You have ${euros(data.summary.disposableCents)}/month you could direct at these.`
              : 'Add income and trim commitments to free up money for goals.'}
          </p>
        </div>
        <Button onClick={() => setDraft({ ...emptyGoal })}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {!hasEmergencyFund && data.suggestedEmergencyFundCents > 0 && (
        <Card className="border-module-finances/30 bg-module-finances/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-module-finances/10 text-module-finances">
                <ShieldPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Start with an emergency fund</p>
                <p className="text-sm text-muted-foreground">
                  Three months of commitments is {euros(data.suggestedEmergencyFundCents)} for your household.
                </p>
              </div>
            </div>
            <Button variant="outline" disabled={busy} onClick={createEmergencyFund}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PiggyBank className="h-4 w-4" />} Create it
            </Button>
          </CardContent>
        </Card>
      )}

      {data.goals.length === 0 ? (
        <EmptyState
          icon={Target}
          module="finances"
          title="No goals yet"
          description="A holiday, a car, a rainy-day fund — give the disposable money a job and watch it add up."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setDraft({
                id: goal.id,
                name: goal.name,
                target: (goal.targetCents / 100).toFixed(2),
                saved: goal.savedCents ? (goal.savedCents / 100).toFixed(2) : '',
                targetDate: goal.targetDate || '',
              })}
              onDelete={async () => {
                if (await confirm({ title: 'Delete goal', description: `Delete the goal "${goal.name}"?`, confirmText: 'Delete', destructive: true })) void submit({ id: goal.id }, 'DELETE')
              }}
            />
          ))}
        </div>
      )}

      {draft && (
        <Dialog open onOpenChange={open => !open && setDraft(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? 'Edit goal' : 'New savings goal'}</DialogTitle>
              <DialogDescription>Set a target — add a date and we&rsquo;ll pace it for you.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault()
                void submit(
                  {
                    ...(draft.id ? { id: draft.id } : {}),
                    name: draft.name,
                    target: draft.target,
                    saved: draft.saved,
                    targetDate: draft.targetDate,
                  },
                  draft.id ? 'PATCH' : 'POST',
                )
              }}
            >
              <label className="block">
                <span className="text-sm font-medium">Goal</span>
                <Input
                  className="mt-1"
                  required
                  maxLength={80}
                  placeholder="Summer holiday, house deposit…"
                  value={draft.name}
                  onChange={event => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium">Target (€)</span>
                  <Input
                    className="mt-1"
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={draft.target}
                    onChange={event => setDraft({ ...draft, target: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Saved so far (€)</span>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={draft.saved}
                    onChange={event => setDraft({ ...draft, saved: event.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium">Target date (optional)</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={draft.targetDate}
                  onChange={event => setDraft({ ...draft, targetDate: event.target.value })}
                />
              </label>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save goal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function GoalCard({ goal, onEdit, onDelete }: { goal: GoalPlan; onEdit: () => void; onDelete: () => void }) {
  const percent = Math.round(goal.progress * 100)
  const complete = goal.remainingCents === 0
  return (
    <Card className="hover:-translate-y-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tracking-tight">{goal.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
              {euros(goal.savedCents)} of {euros(goal.targetCents)}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${goal.name}`} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${goal.name}`} onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn('h-full rounded-full transition-all', complete ? 'bg-brand-green' : 'bg-module-finances')}
            style={{ width: `${Math.max(3, percent)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="tabular-nums">{percent}% there</Badge>
          {complete ? (
            <Badge variant="outline" className="border-brand-green/40 text-brand-green">Goal reached 🎉</Badge>
          ) : goal.targetDate ? (
            <>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> by {goal.targetDate}
              </span>
              {goal.requiredMonthlyCents !== null && (
                <Badge
                  variant="outline"
                  className={cn('tabular-nums', goal.achievable === false && 'border-amber-300 text-amber-700')}
                >
                  {euros(goal.requiredMonthlyCents)}/month{goal.achievable === false ? ' — above disposable' : ''}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">No deadline — save at your own pace</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
