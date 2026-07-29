/**
 * What you have, and how this month is going.
 *
 * The hero counts up to the total because a figure that lands rather than
 * appearing gives the eye somewhere to start; everything else on the page is
 * still and lets it.
 */
import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Eye, EyeOff, Loader2, Pencil, ShieldCheck, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Sparkline } from '@/components/charts'
import { money, monthLabel, relativeSync } from '@/lib/finance/format'
import { useCountUp } from '@/hooks/useCountUp'
import type { CurrentMonthFlow } from '@/lib/finance/analytics-types'
import type { Account } from './types'

export type BalancesBlockProps = {
  accounts: Account[]
  totals: Array<{ currency: string; amount: string }>
  currentMonth: CurrentMonthFlow | null
  currency: string
  action: string | null
  clock: number
  onRename: (account: Account, customName: string | null) => void
  onShare: (account: Account) => void
}

function totalCents(totals: Array<{ currency: string; amount: string }>, currency: string): number {
  const match = totals.find(total => total.currency.toUpperCase() === currency)
  return match ? Math.round(Number(match.amount) * 100) : 0
}

export function BalancesBlock({
  accounts,
  totals,
  currentMonth,
  currency,
  action,
  clock,
  onRename,
  onShare,
}: BalancesBlockProps) {
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const target = totalCents(totals, currency)
  const displayed = useCountUp(target)

  return (
    <section aria-labelledby="banking-balances" className="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
      <h2 id="banking-balances" className="sr-only">Balances</h2>

      <Card className="border-0 bg-gradient-to-br from-brand-blue to-brand-purple text-white hover:-translate-y-0">
        <CardContent className="flex h-full flex-col justify-between gap-5 p-6">
          <div>
            <p className="text-sm text-white/75">Total across your accounts</p>
            <p className="font-display text-4xl font-bold tabular-nums">{money(displayed, { currency })}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Read-only. Clankeep cannot move your money.
            </p>
          </div>

          {/* The hero stretches to match the account grid, so the trend fills the
              space rather than leaving a gap where a chart could be. */}
          {currentMonth && currentMonth.sparkline.length > 1 && (
            <Sparkline
              values={currentMonth.sparkline.map(month => month.spendingCents)}
              color="rgba(255,255,255,0.8)"
              ariaLabel={`Monthly spending over the last ${currentMonth.sparkline.length} months, most recently ${money(currentMonth.spendingCents, { currency })}`}
              size="lg"
              className="h-14 w-full sm:h-20"
            />
          )}

          {currentMonth && (
            <div className="space-y-3 border-t border-white/20 pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-white/75">This month</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {money(currentMonth.spendingCents, { currency })} out
                  </p>
                </div>
                <p className="text-xs text-white/75">
                  {monthLabel(currentMonth.sparkline[0]?.month ?? currentMonth.month)}–{monthLabel(currentMonth.month)}
                </p>
              </div>
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/85">
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Money in</dt>
                  <dd className="tabular-nums">{money(currentMonth.incomeCents, { currency })} in</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Days elapsed</dt>
                  <dd className="tabular-nums">day {currentMonth.daysElapsed} of {currentMonth.daysInMonth}</dd>
                </div>
              </dl>
              {currentMonth.previousMonthSameDayCents > 0 && (
                <p className="text-xs text-white/75">
                  {/* Compared day-for-day, so a month still running is never held
                      against a completed one. */}
                  By this day last month: {money(currentMonth.previousMonthSameDayCents, { currency })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account, index) => (
          <li key={account.id}>
            <Card className="h-full animate-rise hover:-translate-y-0" style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}>
              <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
                <div className="min-w-0">
                  {renaming === account.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={draftName}
                        autoFocus
                        aria-label={`Name for ${account.providerDisplayName}`}
                        onChange={event => setDraftName(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') { onRename(account, draftName.trim() || null); setRenaming(null) }
                          if (event.key === 'Escape') setRenaming(null)
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Save name"
                        onClick={() => { onRename(account, draftName.trim() || null); setRenaming(null) }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Cancel rename" onClick={() => setRenaming(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-semibold leading-snug">{account.displayName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {account.maskedIdentifier || account.cashAccountType || 'Bank account'}
                        </p>
                      </div>
                      {account.canRename && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Rename ${account.displayName}`}
                          disabled={Boolean(action)}
                          onClick={() => { setRenaming(account.id); setDraftName(account.customName || '') }}
                        >
                          {action === `rename:${account.id}`
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Pencil className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="font-display text-2xl font-bold tabular-nums">
                  {account.balance
                    ? money(Math.round(Number(account.balance.amount) * 100), { currency: account.balance.currency })
                    : '—'}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {relativeSync(account.connection.lastSyncedAt, clock)}
                  </span>
                  {account.owned ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={Boolean(action)}
                      onClick={() => onShare(account)}
                    >
                      {action === `share:${account.id}`
                        ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        : account.shared
                          ? <Eye className="mr-1 h-3 w-3" />
                          : <EyeOff className="mr-1 h-3 w-3" />}
                      {account.shared ? 'Shared' : 'Private'}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">{account.shared ? 'Shared' : 'Private'}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
