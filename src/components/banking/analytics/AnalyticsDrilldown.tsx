/**
 * Category, then merchant, then the payments themselves.
 *
 * Every level is a URL, so a drilldown can be shared and browser-back walks up it
 * instead of off the page. Focus moves to the heading when a level opens, because
 * otherwise a keyboard reader is left at the table they just clicked with the new
 * content somewhere below them.
 */
import { useEffect, useRef } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { colorForCategory, ShareBars, type ShareRow } from '@/components/charts'
import { longDate, money, percent } from '@/lib/finance/format'
import type { AnalyticsTransaction, CategoryStat } from '@/lib/finance/analytics-types'

export type AnalyticsDrilldownProps = {
  category: CategoryStat
  merchant: string
  transactions: AnalyticsTransaction[]
  currency: string
  onSelectMerchant: (merchantKey: string) => void
  onClear: () => void
}

export function AnalyticsDrilldown({
  category,
  merchant,
  transactions,
  currency,
  onSelectMerchant,
  onClear,
}: AnalyticsDrilldownProps) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [category.category, merchant])

  const merchantRow = category.merchants.find(entry => entry.merchantKey === merchant)
  const rows: ShareRow[] = category.merchants.map(entry => ({
    key: entry.merchantKey,
    label: entry.merchantName,
    cents: entry.amountCents,
    // Straight from the server: dividing here is what produced 240% shares.
    sharePercent: entry.sharePercent,
    count: entry.count,
    color: colorForCategory(category.category),
    selected: merchant === entry.merchantKey,
    onSelect: () => onSelectMerchant(merchant === entry.merchantKey ? '' : entry.merchantKey),
  }))

  const listed = transactions.filter(transaction =>
    transaction.category === category.category
    && (!merchant || transaction.merchantKey === merchant))

  return (
    <Card className="animate-scale-in border-primary/30 hover:-translate-y-0">
      <CardHeader className="gap-3">
        <nav aria-label="Drilldown" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={onClear}
            className="rounded px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            All categories
          </button>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          {merchant ? (
            <>
              <button
                type="button"
                onClick={() => onSelectMerchant('')}
                className="rounded px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {category.category}
              </button>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-foreground">{merchantRow?.merchantName ?? merchant}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">{category.category}</span>
          )}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {/* A heading rather than CardTitle's h3: this is the section the
                drilldown moves focus to, and it sits at the same level as the
                other analytics sections. */}
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-xl font-semibold leading-none tracking-tight focus-visible:outline-none"
            >
              {merchantRow?.merchantName ?? category.category}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {money(merchantRow?.amountCents ?? category.amountCents, { currency })}
              </span>
              <span>{merchantRow?.count ?? category.count} payments</span>
              {!merchant && (
                <>
                  <span>{percent(category.sharePercent, { decimals: 1 })} of spending</span>
                  <span>largest {money(category.largestCents, { currency })}</span>
                </>
              )}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!merchant && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category.merchantCount} merchant{category.merchantCount === 1 ? '' : 's'}
            </h3>
            <ShareBars rows={rows} currency={currency} emptyMessage="No merchants in this category." />
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listed.length} payment{listed.length === 1 ? '' : 's'}
          </h3>
          <ul className="divide-y divide-border">
            {listed.map(transaction => (
              <li key={transaction.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{transaction.merchantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {longDate(transaction.date)}
                    {transaction.accountName ? ` · ${transaction.accountName}` : ''}
                    {transaction.detail ? ` · ${transaction.detail}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {transaction.flowClass === 'REFUND' && <Badge variant="outline" className="text-[11px]">Refund</Badge>}
                  <span className="tabular-nums font-semibold">
                    {money(Math.abs(transaction.amountCents), { currency })}
                  </span>
                </div>
              </li>
            ))}
            {!listed.length && (
              <li className="py-4 text-sm text-muted-foreground">Nothing to list for this selection.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
