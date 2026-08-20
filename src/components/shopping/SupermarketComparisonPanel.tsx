import React, { useMemo } from 'react'
import { AlertCircle, ExternalLink, RefreshCw, Scale, Sparkles, Tag } from 'lucide-react'
import type { BasketComparison, ComparedItem, PresentedOffer, StoreBasket } from '@/lib/shopping-price-comparison'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface SupermarketComparisonPanelProps {
  comparison: BasketComparison | null
  loading: boolean
  error: string
  onRetry: () => void
  onMatch: (itemId: string, title: string) => void
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2)}€`
}

interface StoreColumn {
  storeId: string
  storeName: string
  complete: boolean
  totalCents: number
  coverageCount: number
  itemCount: number
}

/** Cheapest fresh, available offer for one item at one store. */
function usableOffer(item: ComparedItem, storeId: string): PresentedOffer | null {
  let best: PresentedOffer | null = null
  for (const offer of item.offers) {
    if (offer.storeId !== storeId || !offer.available || offer.freshness !== 'FRESH') continue
    if (!best || offer.lineTotalCents < best.lineTotalCents) best = offer
  }
  return best
}

export default function SupermarketComparisonPanel({
  comparison,
  loading,
  error,
  onRetry,
  onMatch,
}: SupermarketComparisonPanelProps) {
  const needsAttention = comparison?.items.filter(item => item.matchStatus !== 'MATCHED') || []
  const pricedItems = useMemo(
    () => comparison?.items.filter(item => item.offers.some(offer => offer.available && offer.freshness === 'FRESH')) || [],
    [comparison],
  )

  const columns = useMemo<StoreColumn[]>(() => {
    if (!comparison) return []
    const toColumn = (basket: StoreBasket): StoreColumn => ({
      storeId: basket.storeId,
      storeName: basket.storeName,
      complete: basket.complete,
      totalCents: basket.totalCents,
      coverageCount: basket.coverageCount,
      itemCount: basket.itemCount,
    })
    return [...comparison.completeStores.map(toColumn), ...comparison.incompleteStores.map(toColumn)]
      .filter(column => column.coverageCount > 0)
  }, [comparison])

  const cheapest = comparison?.completeStores[0]
  const runnerUp = comparison?.completeStores[1]
  const mixed = comparison?.mixed
  const mixedBeatsSingle = Boolean(
    mixed && mixed.complete && mixed.stores.length > 1 && cheapest && mixed.totalCents < cheapest.totalCents - 20,
  )
  const maxTotal = Math.max(...columns.map(column => column.totalCents), mixed?.totalCents || 0, 1)

  if (loading && !comparison) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-module-shopping" />
        Checking current supermarket prices…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Scale className="h-5 w-5 text-module-shopping" />
            Where is this list cheapest?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Live prices from the supermarkets&rsquo; public catalogues.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={loading} className="min-h-11">
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="min-h-11 bg-background">Try again</Button>
        </div>
      )}

      {comparison && comparison.items.length === 0 && (
        <EmptyState
          icon={Scale}
          module="shopping"
          title="Nothing to compare yet"
          description="Add a few items to this list and Clankeep will price the whole basket at each supermarket."
        />
      )}

      {/* Verdict + store totals */}
      {comparison && comparison.items.length > 0 && (
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          {cheapest ? (
            <p className="text-base">
              <span className="font-display text-lg font-bold">{cheapest.storeName}</span>{' '}
              <span className="text-muted-foreground">has everything for</span>{' '}
              <span className="font-display text-lg font-bold tabular-nums text-module-shopping">{money(cheapest.totalCents)}</span>
              {runnerUp && (
                <span className="text-sm text-muted-foreground"> — {money(runnerUp.totalCents - cheapest.totalCents)} cheaper than {runnerUp.storeName}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No single supermarket currently prices every item, so totals below are partial. Matching more items usually fixes this.
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {columns.map(column => {
              const isCheapest = cheapest?.storeId === column.storeId
              const showBars = Boolean(cheapest)
              return (
                <div key={column.storeId} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm font-semibold sm:w-36">{column.storeName}</span>
                  {/* Bars only compare like with like — partial totals get text instead. */}
                  {showBars && (
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      {column.complete && (
                        <span
                          className={cn('absolute inset-y-0 left-0 rounded-full', isCheapest ? 'bg-module-shopping' : 'bg-muted-foreground/40')}
                          style={{ width: `${Math.max(6, (column.totalCents / maxTotal) * 100)}%` }}
                        />
                      )}
                    </span>
                  )}
                  {!showBars && <span className="flex-1" />}
                  <span className={cn('w-20 shrink-0 text-right text-sm font-bold tabular-nums', isCheapest && 'text-module-shopping')}>
                    {money(column.totalCents)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {column.complete ? 'everything' : `${column.coverageCount} of ${column.itemCount} items`}
                  </span>
                </div>
              )
            })}
          </div>

          {mixedBeatsSingle && mixed && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-module-shopping/10 p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-module-shopping" aria-hidden="true" />
              <span>
                Splitting the shop across {mixed.stores.map(store => store.storeName).join(' + ')} would cost{' '}
                <strong className="tabular-nums">{money(mixed.totalCents)}</strong> — another{' '}
                <strong className="tabular-nums">{money((cheapest?.totalCents || 0) - mixed.totalCents)}</strong> saved if the extra trip is worth it.
              </span>
            </div>
          )}
        </section>
      )}

      {/* Items that can't be priced yet */}
      {comparison && needsAttention.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="h-4 w-4" />
            {needsAttention.length} {needsAttention.length === 1 ? 'item isn’t' : 'items aren’t'} in the totals yet
          </div>
          <div className="space-y-2">
            {needsAttention.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-background/80 p-2.5 pl-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-amber-800">
                    {item.matchStatus === 'UNMATCHED'
                      ? 'Pick which catalogue product this is to include it'
                      : 'No supermarket lists a current price for this product'}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onMatch(item.id, item.title)} className="min-h-11 shrink-0 bg-background">
                  {item.matchStatus === 'UNMATCHED' ? 'Match product' : 'Rematch'}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Item × store price grid */}
      {comparison && pricedItems.length > 0 && columns.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted/50 px-4 py-2.5 font-semibold backdrop-blur">Item</th>
                  {columns.map(column => (
                    <th key={column.storeId} className={cn('px-3 py-2.5 text-right font-semibold', cheapest?.storeId === column.storeId && 'text-module-shopping')}>
                      {column.storeName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricedItems.map(item => {
                  const cells = columns.map(column => ({ column, offer: usableOffer(item, column.storeId) }))
                  const bestCents = Math.min(...cells.filter(cell => cell.offer).map(cell => cell.offer!.lineTotalCents))
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="sticky left-0 z-10 max-w-[200px] bg-card px-4 py-2.5 font-medium">
                        <span className="line-clamp-2">
                          {item.quantityCount > 1 && <span className="text-muted-foreground">{item.quantityCount} × </span>}
                          {item.title}
                        </span>
                      </td>
                      {cells.map(({ column, offer }) => {
                        const isBest = offer && offer.lineTotalCents === bestCents
                        const discounted = offer && ((offer.regularPriceCents && offer.regularPriceCents > offer.priceCents) || offer.isPublicPromotion)
                        const content = offer ? (
                          <span className={cn('inline-flex items-center gap-1 tabular-nums', isBest ? 'font-bold text-module-shopping' : 'text-foreground')}>
                            {discounted && <Tag className="h-3 w-3 text-module-shopping" aria-label="On offer" />}
                            {money(offer.lineTotalCents)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50" aria-label={`Not available at ${column.storeName}`}>—</span>
                        )
                        return (
                          <td key={column.storeId} className={cn('px-3 py-2.5 text-right', isBest && 'bg-module-shopping/5')}>
                            {offer?.sourceUrl ? (
                              <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" title={`View on the ${column.storeName} site`}>
                                {content}
                              </a>
                            ) : content}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-bold">
                  <td className="sticky left-0 z-10 bg-muted/40 px-4 py-3 backdrop-blur">Total</td>
                  {columns.map(column => (
                    <td key={column.storeId} className={cn('px-3 py-3 text-right tabular-nums', cheapest?.storeId === column.storeId && 'text-module-shopping')}>
                      {money(column.totalCents)}
                      {!column.complete && <span className="ml-1 align-super text-[10px] font-semibold text-amber-600">*</span>}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            <Tag className="mr-1 inline h-3 w-3 text-module-shopping" aria-hidden="true" />on offer · — not stocked or no current price · * partial total.
            Prices checked within the last 48 hours; tap a price to see it on the store&rsquo;s site.
          </p>
        </section>
      )}
    </div>
  )
}
