import React, { useState } from 'react'
import { Loader2, Lock, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { HORIZONS, projectAccount, type SavingsAccount } from '@/lib/finance/savings'
import { euros, type PlannerData } from './planner-types'
import SavingsForecastChart from './SavingsForecastChart'

interface SavingsPanelProps {
  householdId: string
  data: PlannerData
  onChanged: () => void
  onError: (message: string) => void
}

type AccountDraft = {
  id?: string
  name: string
  balance: string
  monthlyContribution: string
  visibility: 'SHARED' | 'PRIVATE'
}

const emptyAccount: AccountDraft = {
  name: '',
  balance: '',
  monthlyContribution: '',
  visibility: 'SHARED',
}

export default function SavingsPanel({ householdId, data, onChanged, onError }: SavingsPanelProps) {
  const [draft, setDraft] = useState<AccountDraft | null>(null)
  const [months, setMonths] = useState<number>(HORIZONS[0])
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()

  const save = async (body: Record<string, unknown>, method: string): Promise<void> => {
    setBusy(true)
    try {
      const response = await fetch('/api/finance/planner/accounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...body }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // The API refuses a private→shared flip until the household confirms what becomes visible.
        if (response.status === 409 && body.visibility === 'SHARED' && !body.confirmVisibility) {
          const ok = await confirm({
            title: 'Share this account with your household?',
            description: 'Everyone in the household will be able to see this account, what it holds, and what goes into it. This can be undone.',
            confirmText: 'Share it',
          })
          if (ok) return save({ ...body, confirmVisibility: true }, method)
          return
        }
        throw new Error(payload?.error || 'Could not save that account')
      }
      setDraft(null)
      onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save that account')
    } finally {
      setBusy(false)
    }
  }

  const removeAccount = async (account: SavingsAccount) => {
    const goals = data.goalMarkers.filter(goal => goal.accountId === account.id)
    if (goals.length > 0) {
      await confirm({
        title: `Move ${goals.length === 1 ? 'a goal' : `${goals.length} goals`} first`,
        description: `“${account.name}” is where ${goals.map(goal => goal.name).join(', ')} builds up. Point ${goals.length === 1 ? 'it' : 'them'} somewhere else from the Goals tab, then you can remove this account.`,
        confirmText: 'Got it',
      })
      return
    }
    if (await confirm({
      title: `Remove “${account.name}”?`,
      description: 'It disappears from your savings. Nothing else changes.',
      confirmText: 'Remove',
      destructive: true,
    })) {
      void save({ id: account.id }, 'DELETE')
    }
  }

  if (data.accounts.length === 0) {
    return (
      <>
        <EmptyState
          icon={PiggyBank}
          module="finances"
          title="Put something aside and see where it lands"
          description="Add the accounts you save into, say what each one holds today and how much you can put in each month. Clankeep draws the rest."
          action={
            <Button onClick={() => setDraft({ ...emptyAccount })}>
              <Plus className="h-4 w-4" /> Add a savings account
            </Button>
          }
        />
        {renderAccountDialog()}
      </>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Your savings</h2>
        <Button size="sm" variant="outline" onClick={() => setDraft({ ...emptyAccount })}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      <SavingsForecastChart
        accounts={data.accounts}
        goalMarkers={data.goalMarkers}
        fromPeriod={data.period}
        months={months}
        onMonthsChange={setMonths}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            months={months}
            onEdit={() => setDraft({
              id: account.id,
              name: account.name,
              balance: account.openingBalanceCents ? (account.openingBalanceCents / 100).toFixed(2) : '',
              monthlyContribution: account.monthlyContributionCents ? (account.monthlyContributionCents / 100).toFixed(2) : '',
              visibility: account.visibility,
            })}
            onDelete={() => void removeAccount(account)}
          />
        ))}
      </div>

      {renderAccountDialog()}
    </div>
  )

  function renderAccountDialog() {
    if (!draft) return null
    return (
      <Dialog open onOpenChange={open => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit account' : 'Add a savings account'}</DialogTitle>
            <DialogDescription>
              One of the accounts you put money aside in. Nothing is read from your bank.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault()
              void save(
                {
                  ...(draft.id ? { id: draft.id } : {}),
                  name: draft.name,
                  balance: draft.balance || '0',
                  monthlyContribution: draft.monthlyContribution || '0',
                  visibility: draft.visibility,
                },
                draft.id ? 'PATCH' : 'POST',
              )
            }}
          >
            <label className="block">
              <span className="text-sm font-medium">What do you call it?</span>
              <Input
                className="mt-1"
                required
                maxLength={60}
                placeholder="Savings, rainy day, house fund…"
                value={draft.name}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">What&rsquo;s in it today (optional)</span>
              <Input
                className="mt-1"
                inputMode="decimal"
                placeholder="0.00"
                value={draft.balance}
                onChange={event => setDraft({ ...draft, balance: event.target.value })}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Where the forecast starts. Leave it blank to see only what you add from here on.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium">How much can you put in each month?</span>
              <Input
                className="mt-1"
                inputMode="decimal"
                placeholder="0.00"
                value={draft.monthlyContribution}
                onChange={event => setDraft({ ...draft, monthlyContribution: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Who can see it?</span>
              <select
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:h-10 sm:text-sm"
                value={draft.visibility}
                onChange={event => setDraft({ ...draft, visibility: event.target.value as 'SHARED' | 'PRIVATE' })}
              >
                <option value="SHARED">Everyone in the household</option>
                <option value="PRIVATE">Only me</option>
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                {draft.visibility === 'PRIVATE'
                  ? 'Nobody else sees this account, what it holds, or what goes into it.'
                  : 'Your household sees this account and its forecast.'}
              </span>
            </label>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }
}

function AccountCard({ account, months, onEdit, onDelete }: {
  account: SavingsAccount
  months: number
  onEdit: () => void
  onDelete: () => void
}) {
  const points = projectAccount(account, months)
  const landing = points[points.length - 1]

  return (
    <Card className="hover:-translate-y-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tracking-tight">{account.name}</p>
            {account.visibility === 'PRIVATE' && (
              <Badge variant="outline" className="mt-1 gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Only you can see this
              </Badge>
            )}
          </div>
          {account.canEdit && (
            <div className="flex shrink-0 items-center">
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${account.name}`} onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${account.name}`}
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">In {months} {months === 1 ? 'month' : 'months'}</p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">
            {euros(landing.cents)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">In it today</dt>
            <dd className="font-semibold tabular-nums">{euros(account.openingBalanceCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Going in monthly</dt>
            <dd className="font-semibold tabular-nums">{euros(account.monthlyContributionCents)}</dd>
          </div>
        </dl>

        {account.monthlyContributionCents === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing goes in yet — add a monthly amount to see this one grow.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
