import React from 'react'
import { AlertCircle, ExternalLink, RefreshCw, Scale, Tag } from 'lucide-react'
import type { BasketComparison, ComparedItem, StoreBasket } from '@/lib/shopping-price-comparison'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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

function checkedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

function itemNames(ids: string[], items: ComparedItem[]) {
  const names = new Map(items.map(item => [item.id, item.title]))
  return ids.map(id => names.get(id) || 'Unknown item').join(', ')
}

function SourceLink({ href, className, children }: {
  href: string | null
  className: string
  children: React.ReactNode
}) {
  if (!href) return <div className={className}>{children}</div>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}

function StoreBasketRow({ basket, items, featured = false }: {
  basket: StoreBasket
  items: ComparedItem[]
  featured?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${featured ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{basket.storeName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {basket.coverageCount} of {basket.itemCount} items priced
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-primary">{money(basket.totalCents)}</div>
          {!basket.complete && <div className="text-xs text-amber-700">partial total</div>}
        </div>
      </div>
      {!basket.complete && basket.missingItemIds.length > 0 && (
        <div className="mt-2 text-xs text-amber-700">
          Missing: {itemNames(basket.missingItemIds, items)}
        </div>
      )}
    </div>
  )
}

export default function SupermarketComparisonPanel({
  comparison,
  loading,
  error,
  onRetry,
  onMatch,
}: SupermarketComparisonPanelProps) {
  const needsAttention = comparison?.items.filter(item => item.matchStatus !== 'MATCHED') || []
  const cheapestComplete = comparison?.completeStores[0]

  if (loading && !comparison) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
        Loading current supermarket prices…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Scale className="h-5 w-5 text-primary" />
            Compare supermarkets
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Fresh public catalogue prices for active items.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={loading} className="min-h-11">
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="min-h-11 bg-white">Try again</Button>
        </div>
      )}

      {comparison && comparison.items.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add active items to this list to compare supermarket prices.
        </div>
      )}

      {comparison && needsAttention.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="h-4 w-4" />
            {needsAttention.length} {needsAttention.length === 1 ? 'item needs' : 'items need'} attention
          </div>
          <div className="space-y-2">
            {needsAttention.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-background/80 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-amber-800">
                    {item.matchStatus === 'UNMATCHED' ? 'Not matched to a catalogue product' : 'No fresh available public offer'}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onMatch(item.id, item.title)} className="min-h-11 shrink-0 bg-white">
                  {item.matchStatus === 'UNMATCHED' ? 'Match' : 'Rematch'}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {comparison && comparison.items.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Cheapest complete single store</h3>
            {cheapestComplete ? (
              <StoreBasketRow basket={cheapestComplete} items={comparison.items} featured />
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No supermarket currently prices every item.
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Cheapest mixed-store basket</h3>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">Across {comparison.mixed.stores.length || 0} supermarkets</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {comparison.mixed.coverageCount} of {comparison.mixed.itemCount} items priced
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">{money(comparison.mixed.totalCents)}</div>
                  {!comparison.mixed.complete && <div className="text-xs text-amber-700">partial total</div>}
                </div>
              </div>
              {!comparison.mixed.complete && comparison.mixed.missingItemIds.length > 0 && (
                <div className="mt-2 text-xs text-amber-700">
                  Missing: {itemNames(comparison.mixed.missingItemIds, comparison.items)}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {comparison && comparison.completeStores.length > 1 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Other complete stores</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {comparison.completeStores.slice(1).map(store => <StoreBasketRow key={store.storeId} basket={store} items={comparison.items} />)}
          </div>
        </details>
      )}

      {comparison && comparison.incompleteStores.length > 0 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Partial single-store totals</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {comparison.incompleteStores.map(store => <StoreBasketRow key={store.storeId} basket={store} items={comparison.items} />)}
          </div>
        </details>
      )}

      {comparison && comparison.mixed.stores.length > 0 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Mixed basket breakdown</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {comparison.mixed.stores.map(store => (
              <div key={store.storeId} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{store.storeName}</span>
                  <span className="text-sm font-semibold text-primary">{money(store.subtotalCents)}</span>
                </div>
                <div className="space-y-1.5">
                  {store.items.map(item => (
                    <div key={item.shoppingItemId} className="flex items-start justify-between gap-3 text-xs">
                      <SourceLink href={item.sourceUrl} className="min-w-0 hover:text-primary">
                        {item.quantityCount} × {item.title}{item.sourceUrl && <ExternalLink className="ml-1 inline h-3 w-3" />}
                      </SourceLink>
                      <span className="shrink-0 font-medium">{money(item.lineTotalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {comparison && comparison.items.some(item => item.offers.length > 0) && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Offer details, freshness and sources</summary>
          <div className="mt-3 space-y-4">
            {comparison.items.filter(item => item.offers.length > 0).map(item => (
              <div key={item.id}>
                <div className="mb-2 text-sm font-medium">{item.quantityCount} × {item.title}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {item.offers.map(offer => (
                    <SourceLink key={`${offer.storeId}-${offer.productId}`} href={offer.sourceUrl} className="rounded-md border p-3 text-xs hover:bg-secondary/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{offer.storeName}</span>
                        <span className="font-semibold text-primary">{money(offer.lineTotalCents)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-muted-foreground">
                        <Badge variant="outline" className={offer.freshness === 'FRESH' ? 'text-green-700' : 'text-amber-700'}>{offer.freshness === 'FRESH' ? 'Fresh' : 'Stale — excluded'}</Badge>
                        {!offer.available && <Badge variant="outline">Unavailable</Badge>}
                        {offer.isPublicPromotion && <Badge variant="outline" className="border-green-200 text-green-700"><Tag className="mr-1 h-3 w-3" />Promotion</Badge>}
                        {offer.loyaltyPriceCents && offer.loyaltyPriceCents < offer.priceCents && <Badge variant="outline" className="border-violet-200 text-violet-700">Loyalty {money(offer.loyaltyPriceCents)} — excluded</Badge>}
                        <span>Checked {checkedAt(offer.observedAt)}</span>
                        {offer.unitPriceCents && offer.unitPriceUnit && <span>• {money(offer.unitPriceCents)}/{offer.unitPriceUnit}</span>}
                        {offer.sourceUrl && <ExternalLink className="h-3 w-3" />}
                      </div>
                    </SourceLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Generated {checkedAt(comparison.generatedAt)}. Stale and loyalty-only prices are excluded from totals.</div>
        </details>
      )}
    </div>
  )
}
