/**
 * Who you paid, ranked.
 *
 * A merchant can span categories — a supermarket that also sells fuel — so each
 * row carries its split rather than being forced into whichever category it
 * happened to appear in first.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { colorForCategory } from '@/components/charts'
import { money, percent, shortDate } from '@/lib/finance/format'
import type { MerchantStat } from '@/lib/finance/analytics-types'

export type AnalyticsMerchantSectionProps = {
  merchants: MerchantStat[]
  currency: string
  limit?: number
}

export function AnalyticsMerchantSection({ merchants, currency, limit = 15 }: AnalyticsMerchantSectionProps) {
  const listed = merchants.slice(0, limit)

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="text-xl">Who you paid</CardTitle>
        <CardDescription>
          {merchants.length > limit
            ? `The ${limit} largest of ${merchants.length} merchants in this period.`
            : 'Every merchant in this period, largest first.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {listed.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No spending in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <caption className="sr-only">Merchants by total spent</caption>
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Merchant</th>
                  <th scope="col" className="py-2 text-right font-medium">Total</th>
                  <th scope="col" className="py-2 text-right font-medium">Payments</th>
                  <th scope="col" className="py-2 text-right font-medium">Typical</th>
                  <th scope="col" className="py-2 text-right font-medium">Share</th>
                  <th scope="col" className="py-2 text-right font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {listed.map(merchant => (
                  <tr key={merchant.merchantKey} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="max-w-[220px] py-2.5 text-left font-normal">
                      <span className="block truncate font-medium">{merchant.merchantName}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {merchant.categories.map(entry => (
                          <span key={entry.category} className="flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: colorForCategory(entry.category) }}
                              aria-hidden="true"
                            />
                            {entry.category}
                            {merchant.categories.length > 1 && ` ${money(entry.amountCents, { currency })}`}
                          </span>
                        ))}
                      </span>
                    </th>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{money(merchant.amountCents, { currency })}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{merchant.count}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{money(merchant.averageCents, { currency })}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{percent(merchant.sharePercent, { decimals: 1 })}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{shortDate(merchant.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
