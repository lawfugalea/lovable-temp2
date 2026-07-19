import React, { useState } from 'react'
import {
  CalendarClock,
  CircleDollarSign,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import {
  COMMITMENT_CATEGORIES,
  FREQUENCY_LABELS,
  PLANNER_FREQUENCIES,
  commitmentRatioBand,
  monthlyCents,
  type PlannerFrequency,
} from '@/lib/budget'
import { euros, type PlannerCommitment, type PlannerData, type PlannerIncome } from './planner-types'

interface PlannerPanelProps {
  householdId: string
  data: PlannerData
  onChanged: () => void
  onError: (message: string) => void
}

type IncomeDraft = { id?: string; label: string; amount: string; frequency: PlannerFrequency; userId: string }
type CommitmentDraft = IncomeDraft & { category: string; essential: boolean }

const emptyIncome: IncomeDraft = { label: '', amount: '', frequency: 'MONTHLY', userId: '' }
const emptyCommitment: CommitmentDraft = { ...emptyIncome, category: 'housing', essential: true }

const ratioCopy: Record<ReturnType<typeof commitmentRatioBand>, { label: string; className: string }> = {
  unknown: { label: 'Add income to see your ratio', className: 'bg-white/15 text-white' },
  comfortable: { label: 'Comfortable — under 60% committed', className: 'bg-emerald-400/20 text-emerald-100' },
  stretched: { label: 'Stretched — over 60% committed', className: 'bg-amber-400/25 text-amber-100' },
  overcommitted: { label: 'Overcommitted — above 80%', className: 'bg-red-400/25 text-red-100' },
}

export default function PlannerPanel({ householdId, data, onChanged, onError }: PlannerPanelProps) {
  const [incomeDraft, setIncomeDraft] = useState<IncomeDraft | null>(null)
  const [commitmentDraft, setCommitmentDraft] = useState<CommitmentDraft | null>(null)
  const [busy, setBusy] = useState(false)

  const memberName = (userId: string | null) =>
    userId ? data.members.find(member => member.userId === userId)?.name?.split(/\s+/)[0] : null

  const submit = async (endpoint: 'income' | 'commitments', body: Record<string, unknown>, method: string) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/finance/planner/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...body }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Could not save')
      setIncomeDraft(null)
      setCommitmentDraft(null)
      onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const removeEntry = async (endpoint: 'income' | 'commitments', id: string) => {
    if (!window.confirm('Remove this entry from the plan?')) return
    await submit(endpoint, { id }, 'DELETE')
  }

  const summary = data.summary
  const band = commitmentRatioBand(summary.commitmentRatio)
  const hasAnything = data.incomes.length > 0 || data.commitments.length > 0

  if (!hasAnything) {
    return (
      <>
        <EmptyState
          icon={Wallet}
          module="finances"
          title="Let's map your household money"
          description="Add what comes in and what goes out — Clankeep does the maths and shows what's truly yours to direct each month."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setIncomeDraft({ ...emptyIncome })}>
                <Plus className="h-4 w-4" /> Add first income
              </Button>
              <Button variant="outline" onClick={() => setCommitmentDraft({ ...emptyCommitment })}>
                Add a commitment
              </Button>
            </div>
          }
        />
        {renderIncomeDialog()}
        {renderCommitmentDialog()}
      </>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary hero */}
      <Card className="border-0 bg-gradient-to-br from-brand-blue to-brand-purple text-white hover:-translate-y-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/75">Comes in monthly</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums tracking-tight">
                {euros(summary.monthlyIncomeCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/75">Committed monthly</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums tracking-tight">
                {euros(summary.monthlyCommitmentsCents)}
              </p>
              <p className="mt-1 text-xs text-white/70">
                {euros(summary.essentialCents)} essential · {euros(summary.lifestyleCents)} lifestyle
              </p>
            </div>
            <div>
              <p className="text-sm text-white/75">Yours to direct</p>
              <p className={cn('mt-1 font-display text-3xl font-bold tabular-nums tracking-tight', summary.disposableCents < 0 && 'text-red-200')}>
                {euros(summary.disposableCents)}
              </p>
              {summary.disposableCents > 0 && (
                <p className="mt-1 text-xs text-white/70">≈ {euros(summary.safeToSpendWeeklyCents)} safe to spend weekly</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', ratioCopy[band].className)}>
              {ratioCopy[band].label}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> Only your household can see this plan
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Income */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-module-finances" /> Income
              </CardTitle>
              <CardDescription>Salaries, benefits, bonuses — everyone counts.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIncomeDraft({ ...emptyIncome })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.incomes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No income added yet.</p>
            )}
            {data.incomes.map(income => (
              <div key={income.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{income.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {euros(income.amountCents)} {FREQUENCY_LABELS[income.frequency].toLowerCase()}
                    {memberName(income.userId) ? ` · ${memberName(income.userId)}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">{euros(monthlyCents(income))}<span className="text-xs font-medium text-muted-foreground">/mo</span></span>
                <EntryActions
                  onEdit={() => setIncomeDraft({
                    id: income.id,
                    label: income.label,
                    amount: (income.amountCents / 100).toFixed(2),
                    frequency: income.frequency,
                    userId: income.userId || '',
                  })}
                  onDelete={() => removeEntry('income', income.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Commitments */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CircleDollarSign className="h-5 w-5 text-module-finances" /> Commitments
              </CardTitle>
              <CardDescription>Everything with your name on it, any frequency.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCommitmentDraft({ ...emptyCommitment })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.commitments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No commitments added yet.</p>
            )}
            {data.commitments.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{item.label}</p>
                    {!item.essential && <Badge variant="outline" className="shrink-0 text-[10px]">Lifestyle</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(item.category)} · {euros(item.amountCents)} {FREQUENCY_LABELS[item.frequency].toLowerCase()}
                    {memberName(item.userId) ? ` · ${memberName(item.userId)}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">{euros(monthlyCents(item))}<span className="text-xs font-medium text-muted-foreground">/mo</span></span>
                <EntryActions
                  onEdit={() => setCommitmentDraft({
                    id: item.id,
                    label: item.label,
                    amount: (item.amountCents / 100).toFixed(2),
                    frequency: item.frequency,
                    userId: item.userId || '',
                    category: item.category,
                    essential: item.essential,
                  })}
                  onDelete={() => removeEntry('commitments', item.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Set-asides */}
      {summary.setAsides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-module-finances" /> Monthly set-asides
            </CardTitle>
            <CardDescription>
              Put these aside monthly so irregular bills never sting: {euros(summary.setAsides.reduce((total, item) => total + item.monthlyCents, 0))}/month in total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summary.setAsides.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {euros(item.amountCents)} {FREQUENCY_LABELS[item.frequency].toLowerCase()}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-module-finances">
                    <PiggyBank className="h-3.5 w-3.5" /> {euros(item.monthlyCents)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {renderIncomeDialog()}
      {renderCommitmentDialog()}
    </div>
  )

  function renderIncomeDialog() {
    if (!incomeDraft) return null
    return (
      <Dialog open onOpenChange={open => !open && setIncomeDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{incomeDraft.id ? 'Edit income' : 'Add income'}</DialogTitle>
            <DialogDescription>Net amounts work best — what actually lands in the account.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault()
              void submit(
                'income',
                {
                  ...(incomeDraft.id ? { id: incomeDraft.id } : {}),
                  label: incomeDraft.label,
                  amount: incomeDraft.amount,
                  frequency: incomeDraft.frequency,
                  userId: incomeDraft.userId || null,
                },
                incomeDraft.id ? 'PATCH' : 'POST',
              )
            }}
          >
            <LabeledInput
              label="What is it?"
              placeholder="Salary, freelance, statutory bonus…"
              value={incomeDraft.label}
              onChange={value => setIncomeDraft({ ...incomeDraft, label: value })}
            />
            <AmountFrequencyFields
              amount={incomeDraft.amount}
              frequency={incomeDraft.frequency}
              onAmount={value => setIncomeDraft({ ...incomeDraft, amount: value })}
              onFrequency={value => setIncomeDraft({ ...incomeDraft, frequency: value })}
            />
            <MemberSelect
              members={data.members}
              value={incomeDraft.userId}
              onChange={value => setIncomeDraft({ ...incomeDraft, userId: value })}
            />
            <DialogActions busy={busy} onCancel={() => setIncomeDraft(null)} />
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  function renderCommitmentDialog() {
    if (!commitmentDraft) return null
    return (
      <Dialog open onOpenChange={open => !open && setCommitmentDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commitmentDraft.id ? 'Edit commitment' : 'Add commitment'}</DialogTitle>
            <DialogDescription>Rent, loans, bills, school — any frequency, we normalise it.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault()
              void submit(
                'commitments',
                {
                  ...(commitmentDraft.id ? { id: commitmentDraft.id } : {}),
                  label: commitmentDraft.label,
                  amount: commitmentDraft.amount,
                  frequency: commitmentDraft.frequency,
                  category: commitmentDraft.category,
                  essential: commitmentDraft.essential,
                  userId: commitmentDraft.userId || null,
                },
                commitmentDraft.id ? 'PATCH' : 'POST',
              )
            }}
          >
            <LabeledInput
              label="What is it?"
              placeholder="Rent, ARMS bill, car insurance…"
              value={commitmentDraft.label}
              onChange={value => setCommitmentDraft({ ...commitmentDraft, label: value })}
            />
            <AmountFrequencyFields
              amount={commitmentDraft.amount}
              frequency={commitmentDraft.frequency}
              onAmount={value => setCommitmentDraft({ ...commitmentDraft, amount: value })}
              onFrequency={value => setCommitmentDraft({ ...commitmentDraft, frequency: value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Category</span>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                  value={commitmentDraft.category}
                  onChange={event => setCommitmentDraft({ ...commitmentDraft, category: event.target.value })}
                >
                  {COMMITMENT_CATEGORIES.map(category => (
                    <option key={category.key} value={category.key}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Type</span>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                  value={commitmentDraft.essential ? 'essential' : 'lifestyle'}
                  onChange={event => setCommitmentDraft({ ...commitmentDraft, essential: event.target.value === 'essential' })}
                >
                  <option value="essential">Essential</option>
                  <option value="lifestyle">Lifestyle</option>
                </select>
              </label>
            </div>
            <MemberSelect
              members={data.members}
              value={commitmentDraft.userId}
              onChange={value => setCommitmentDraft({ ...commitmentDraft, userId: value })}
            />
            <DialogActions busy={busy} onCancel={() => setCommitmentDraft(null)} />
          </form>
        </DialogContent>
      </Dialog>
    )
  }
}

function categoryLabel(key: string): string {
  return COMMITMENT_CATEGORIES.find(category => category.key === key)?.label ?? 'Other'
}

function EntryActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function LabeledInput({ label, value, placeholder, onChange }: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <Input
        className="mt-1"
        required
        maxLength={80}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}

function AmountFrequencyFields({ amount, frequency, onAmount, onFrequency }: {
  amount: string
  frequency: PlannerFrequency
  onAmount: (value: string) => void
  onFrequency: (value: PlannerFrequency) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-sm font-medium">Amount (€)</span>
        <Input
          className="mt-1"
          required
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={event => onAmount(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">How often</span>
        <select
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
          value={frequency}
          onChange={event => onFrequency(event.target.value as PlannerFrequency)}
        >
          {PLANNER_FREQUENCIES.map(value => (
            <option key={value} value={value}>{FREQUENCY_LABELS[value]}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function MemberSelect({ members, value, onChange }: {
  members: Array<{ userId: string; name: string }>
  value: string
  onChange: (value: string) => void
}) {
  if (members.length < 2) return null
  return (
    <label className="block">
      <span className="text-sm font-medium">Belongs to</span>
      <select
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Whole household</option>
        {members.map(member => (
          <option key={member.userId} value={member.userId}>{member.name}</option>
        ))}
      </select>
    </label>
  )
}

function DialogActions({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </Button>
    </div>
  )
}
