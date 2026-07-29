/**
 * The money that only moved.
 *
 * It is kept out of spending and income, so this is where it goes: excluded is
 * not the same as hidden, and a household should be able to see exactly what was
 * set aside and why.
 */
import { ArrowRight, Info } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { longDate, money } from '@/lib/finance/format'
import type { InternalTransfersSummary } from '@/lib/finance/analytics-types'

export type AnalyticsTransfersSectionProps = {
  internalTransfers: InternalTransfersSummary
  currency: string
}

export function AnalyticsTransfersSection({ internalTransfers, currency }: AnalyticsTransfersSectionProps) {
  const { pairs, matchedAmountCents, unmatchedInCents, unmatchedOutCents, unmatchedCount } = internalTransfers
  if (!pairs.length && !unmatchedCount) return null

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="text-xl">Money you moved</CardTitle>
        <CardDescription>
          Transfers between your own accounts. Counted in neither spending nor income, because nothing was
          earned or spent — but shown here so the totals can be checked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pairs.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{money(matchedAmountCents, { currency })}</span> across{' '}
              {pairs.length} transfer{pairs.length === 1 ? '' : 's'} where both sides are visible.
            </p>
            <ul className="divide-y divide-border">
              {pairs.map(pair => (
                <li key={pair.transactionIds.join('-')} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{pair.fromAccountName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{pair.toAccountName}</span>
                    {pair.confidence === 'AMOUNT_DATE' && (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal"
                        title="Matched on amount and date. The bank did not name the other account."
                      >
                        Likely pair
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{longDate(pair.date)}</span>
                    <span className="tabular-nums font-semibold">{money(pair.amountCents, { currency })}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unmatchedCount > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {unmatchedCount} transfer{unmatchedCount === 1 ? '' : 's'} had only one side visible
              {unmatchedInCents > 0 && <> — {money(unmatchedInCents, { currency })} arriving</>}
              {unmatchedInCents > 0 && unmatchedOutCents > 0 && ','}
              {unmatchedOutCents > 0 && <> {money(unmatchedOutCents, { currency })} leaving</>}
              {internalTransfers.unmatchedAccountHints.length > 0 && (
                <> (accounts {internalTransfers.unmatchedAccountHints.join(', ')})</>
              )}
              . Connecting the other account would let both sides be matched exactly.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
