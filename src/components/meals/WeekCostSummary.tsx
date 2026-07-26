import { Loader2, ShoppingBasket, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BasketComparison, StoreBasket } from '@/lib/shopping-price-comparison'

interface WeekCostSummaryProps {
  comparison: BasketComparison
  busy: boolean
  /** Fills the shopping list from the plan, then opens it on the compare tab. */
  onAddAndShop: () => void
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/**
 * The answer to "what does this week cost, and where should I buy it?".
 *
 * Pricing a week and filling a shopping list already existed but as two
 * unrelated buttons: you could see that Store A was cheapest and then had to
 * separately add the ingredients and navigate to Shopping to act on it. This
 * puts the cheapest complete basket and the action that uses it in one place.
 */
export default function WeekCostSummary({ comparison, busy, onAddAndShop }: WeekCostSummaryProps) {
  // Only a store that stocks every planned ingredient is a real answer. A
  // cheaper store missing half the basket is not cheaper, it is incomplete.
  const cheapest: StoreBasket | undefined = comparison.completeStores[0]
  const runnerUp: StoreBasket | undefined = comparison.completeStores[1]
  const mixed = comparison.mixed

  if (!cheapest) {
    // Fall back to the split-basket total, which is what the panel below shows
    // when no single shop covers the week.
    if (!mixed.complete) return null
    return (
      <div className="rounded-xl border bg-card p-4 shadow-soft-sm">
        <p className="text-sm text-muted-foreground">
          No single supermarket stocks the whole week. Split across{' '}
          {mixed.stores.length} {mixed.stores.length === 1 ? 'shop' : 'shops'} it comes to{' '}
          <strong className="text-foreground">{formatEuro(mixed.totalCents)}</strong>.
        </p>
        <Button type="button" onClick={onAddAndShop} disabled={busy} className="mt-3 min-h-11 w-full sm:w-auto">
          {busy ? <Loader2 className="animate-spin" /> : <ShoppingBasket />}
          Add ingredients and open the list
        </Button>
      </div>
    )
  }

  const saving = runnerUp ? runnerUp.totalCents - cheapest.totalCents : 0

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4 shrink-0 text-module-shopping" aria-hidden="true" />
            Cheapest for the whole week
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight">
            {cheapest.storeName} · {formatEuro(cheapest.totalCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            All {cheapest.itemCount} planned {cheapest.itemCount === 1 ? 'ingredient' : 'ingredients'} in stock
            {saving > 0 && <> · {formatEuro(saving)} less than {runnerUp?.storeName}</>}
          </p>
        </div>
        <Button type="button" onClick={onAddAndShop} disabled={busy} className="min-h-11 shrink-0">
          {busy ? <Loader2 className="animate-spin" /> : <ShoppingBasket />}
          Add ingredients and shop
        </Button>
      </div>
    </div>
  )
}
