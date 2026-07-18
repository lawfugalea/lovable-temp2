import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Loader2, Package, Percent, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export interface SupermarketOffer {
  productId: string
  canonicalProductId: string | null
  title: string
  brand: string | null
  packageValue: string | null
  packageUnit: string | null
  packCount: number
  imageUrl: string | null
  sourceUrl: string | null
  storeName: string
  storeSlug: string
  priceCents: number
  regularPriceCents: number
  savingCents: number
  discountPercent: number
  observedAt: string
}

interface OffersPanelProps {
  offers: SupermarketOffer[]
  loading: boolean
  error: string
  canAdd: boolean
  addingProductId: string | null
  onRetry: () => void
  onAdd: (offer: SupermarketOffer) => void
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2)}€`
}

function offerPackLabel(offer: SupermarketOffer) {
  const size = offer.packageValue && offer.packageUnit ? `${offer.packageValue}${offer.packageUnit}` : ''
  const count = offer.packCount > 1 ? `${offer.packCount} pack` : ''
  return [offer.brand, count, size].filter(Boolean).join(' · ')
}

function OfferThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
      {showImage
        ? <Image src={src!} alt={alt} width={64} height={64} className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />
        : <Package className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />}
    </div>
  )
}

type OfferSort = 'percent' | 'saving'

export default function OffersPanel({ offers, loading, error, canAdd, addingProductId, onRetry, onAdd }: OffersPanelProps) {
  const [storeFilter, setStoreFilter] = useState('all')
  const [sort, setSort] = useState<OfferSort>('percent')

  const stores = useMemo(() => {
    const seen = new Map<string, string>()
    offers.forEach(offer => seen.set(offer.storeSlug, offer.storeName))
    return Array.from(seen, ([slug, name]) => ({ slug, name }))
  }, [offers])

  const visible = useMemo(() => {
    const filtered = storeFilter === 'all' ? offers : offers.filter(offer => offer.storeSlug === storeFilter)
    return [...filtered].sort((a, b) => (
      sort === 'percent'
        ? b.discountPercent - a.discountPercent || b.savingCents - a.savingCents
        : b.savingCents - a.savingCents || b.discountPercent - a.discountPercent
    ))
  }, [offers, storeFilter, sort])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading offers">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={Percent}
        module="shopping"
        title="Offers are unavailable right now"
        description={error}
        action={<Button type="button" variant="outline" onClick={onRetry} className="min-h-11"><RefreshCw />Try again</Button>}
      />
    )
  }

  if (!offers.length) {
    return (
      <EmptyState
        icon={Percent}
        module="shopping"
        title="No standout offers today"
        description="Prices refresh from the supermarket catalogues every day — check back after the next sync."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter offers by supermarket">
          {[{ slug: 'all', name: 'All stores' }, ...stores].map(store => (
            <button
              key={store.slug}
              type="button"
              aria-pressed={storeFilter === store.slug}
              onClick={() => setStoreFilter(store.slug)}
              className={cn(
                'min-h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                storeFilter === store.slug
                  ? 'border-module-shopping/40 bg-module-shopping/10 text-module-shopping'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {store.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border p-0.5" role="group" aria-label="Sort offers">
            <button
              type="button"
              aria-pressed={sort === 'percent'}
              onClick={() => setSort('percent')}
              className={cn(
                'min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sort === 'percent' ? 'bg-module-shopping/10 text-module-shopping' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Biggest %
            </button>
            <button
              type="button"
              aria-pressed={sort === 'saving'}
              onClick={() => setSort('saving')}
              className={cn(
                'min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sort === 'saving' ? 'bg-module-shopping/10 text-module-shopping' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Biggest saving €
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{visible.length} offer{visible.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(offer => {
          const adding = addingProductId === offer.productId
          return (
            <div key={offer.productId} className="flex flex-col rounded-xl border bg-card p-4 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex gap-3">
                <OfferThumbnail src={offer.imageUrl} alt="" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{offer.title}</p>
                    <span className="shrink-0 rounded-full bg-brand-coral px-2 py-0.5 text-xs font-bold text-white">-{offer.discountPercent}%</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{offerPackLabel(offer) || 'Pack size not listed'}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{offer.storeName}</p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3 border-t pt-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold tabular-nums">{money(offer.priceCents)}</span>
                    <span className="text-sm tabular-nums text-muted-foreground line-through">{money(offer.regularPriceCents)}</span>
                  </div>
                  <p className="text-xs font-semibold text-module-shopping">Save {money(offer.savingCents)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAdd || adding}
                  onClick={() => onAdd(offer)}
                  className="min-h-10 shrink-0"
                  aria-label={`Add ${offer.title} to the list`}
                >
                  {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Offers come from public online catalogues and refresh daily. Estimates for planning — in-store prices can differ.
        Only stores that publish before-and-after prices can appear here; Smart&apos;s online catalogue lists a single price per product, so its offers cannot be detected.
      </p>
    </div>
  )
}
