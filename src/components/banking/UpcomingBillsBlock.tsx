/**
 * What is due in the next month.
 *
 * Confirmed subscriptions and detected candidates are both shown but always
 * distinguishable: a guess presented with the same authority as a fact is how a
 * useful list becomes one nobody trusts.
 */
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { money, relativeDay } from '@/lib/finance/format'
import type { UpcomingBill } from '@/lib/finance/analytics-types'

export type UpcomingBillsBlockProps = {
  bills: UpcomingBill[]
  currency: string
  canManage: boolean
}

const GROUPS: Array<{ label: string; matches: (bill: UpcomingBill) => boolean }> = [
  { label: 'Overdue', matches: bill => bill.state === 'OVERDUE' },
  { label: 'This week', matches: bill => bill.daysUntilDue >= 0 && bill.daysUntilDue <= 7 },
  { label: 'Next week', matches: bill => bill.daysUntilDue > 7 && bill.daysUntilDue <= 14 },
  { label: 'Later this month', matches: bill => bill.daysUntilDue > 14 },
]

export function UpcomingBillsBlock({ bills, currency, canManage }: UpcomingBillsBlockProps) {
  const total = bills.reduce((sum, bill) => sum + bill.amountCents, 0)

  return (
    <Card className="instrument-grid relative overflow-hidden transition-shadow hover:-translate-y-0 hover:shadow-glow-inset">
      <CardHeader className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarClock className="h-5 w-5 text-module-finances" aria-hidden="true" />
              Coming up
            </CardTitle>
            <CardDescription>Recurring payments due in the next 30 days.</CardDescription>
          </div>
          {bills.length > 0 && (
            <p className="font-display text-xl font-semibold tabular-nums">{money(total, { currency })}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            module="banking"
            title="No recurring payments spotted yet"
            description="Detection needs two or three cycles from the same merchant. Nothing to do — they will appear here."
            action={canManage
              ? <Button asChild size="sm" variant="outline"><Link href="/banking?tab=subscriptions">Add one manually</Link></Button>
              : undefined}
            className="border-0 bg-transparent px-0 py-8"
          />
        ) : (
          <div className="space-y-5">
            {GROUPS.map(group => {
              const items = bills.filter(group.matches)
              if (!items.length) return null
              return (
                <div key={group.label}>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {items.map((bill, index) => (
                      <li
                        key={bill.id}
                        className="flex animate-rise items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
                        style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{bill.merchantName}</p>
                          <p className="text-xs text-muted-foreground">
                            {relativeDay(bill.dueDate)} · {bill.cadence.toLowerCase()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {bill.source === 'DETECTED' && (
                            <Badge
                              variant="outline"
                              className="text-[11px]"
                              title={`Spotted from your history${bill.confidence ? `, ${Math.round(bill.confidence * 100)}% confident` : ''}. Not confirmed.`}
                            >
                              Likely
                            </Badge>
                          )}
                          <span className="tabular-nums font-semibold">{money(bill.amountCents, { currency })}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
