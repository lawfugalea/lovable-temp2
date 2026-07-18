import { normalizeCatalogText } from './catalog-normalization'
import type { ComparisonItemInput } from './shopping-price-comparison'

export interface PlanIngredient {
  name: string
  quantity: number | string
  unit: string | null
  canonicalProductId: string | null
}

export interface AggregatedIngredient {
  name: string
  unit: string | null
  canonicalProductId: string | null
  /** Sum of recipe quantities (may be fractional, e.g. 1.5 kg). */
  totalQuantity: number
  /** Shopping-list count: total rounded up, at least 1. */
  quantityCount: number
}

function ingredientKey(ingredient: PlanIngredient): string {
  if (ingredient.canonicalProductId) return `product:${ingredient.canonicalProductId}`
  const unit = (ingredient.unit || '').trim().toLowerCase()
  return `name:${normalizeCatalogText(ingredient.name)}:${unit}`
}

/**
 * Combine ingredients across planned recipes: same catalogue product (or the
 * same normalized name + unit) becomes one line with summed quantities.
 * Quantities are summed exactly first and only rounded up at the end.
 */
export function aggregateIngredients(ingredients: PlanIngredient[]): AggregatedIngredient[] {
  const byKey = new Map<string, AggregatedIngredient>()
  for (const ingredient of ingredients) {
    const name = ingredient.name.trim()
    if (!name) continue
    const quantity = Number(ingredient.quantity)
    const amount = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    const key = ingredientKey(ingredient)
    const existing = byKey.get(key)
    if (existing) {
      existing.totalQuantity += amount
    } else {
      byKey.set(key, {
        name,
        unit: ingredient.unit?.trim() || null,
        canonicalProductId: ingredient.canonicalProductId || null,
        totalQuantity: amount,
        quantityCount: 1,
      })
    }
  }
  return Array.from(byKey.values()).map(entry => ({
    ...entry,
    totalQuantity: Number(entry.totalQuantity.toFixed(6)),
    quantityCount: Math.max(1, Math.ceil(entry.totalQuantity - 1e-9)),
  }))
}

/** Shape aggregated ingredients for buildBasketComparison with synthetic ids. */
export function toComparisonInputs(
  aggregated: AggregatedIngredient[],
): Array<Omit<ComparisonItemInput, 'offers'>> {
  return aggregated.map((ingredient, index) => ({
    id: `plan:${index}`,
    title: ingredient.name,
    quantityCount: ingredient.quantityCount,
    canonicalProductId: ingredient.canonicalProductId,
  }))
}

export interface ExistingListItem {
  id: string
  title: string
  quantityCount: number
  canonicalProductId: string | null
}

export interface MergePlan {
  creates: Array<{ title: string; quantityCount: number; canonicalProductId: string | null }>
  increments: Array<{ itemId: string; addCount: number }>
}

/**
 * Merge aggregated ingredients into a list's existing active items: matching
 * items (same catalogue product, else same normalized title) get their
 * quantity incremented; everything else becomes a new item.
 */
export function mergeIntoExistingItems(
  aggregated: AggregatedIngredient[],
  existing: ExistingListItem[],
): MergePlan {
  const byProduct = new Map<string, ExistingListItem>()
  const byTitle = new Map<string, ExistingListItem>()
  for (const item of existing) {
    if (item.canonicalProductId && !byProduct.has(item.canonicalProductId)) {
      byProduct.set(item.canonicalProductId, item)
    }
    const titleKey = normalizeCatalogText(item.title)
    if (titleKey && !byTitle.has(titleKey)) byTitle.set(titleKey, item)
  }

  const plan: MergePlan = { creates: [], increments: [] }
  for (const ingredient of aggregated) {
    const match =
      (ingredient.canonicalProductId && byProduct.get(ingredient.canonicalProductId)) ||
      byTitle.get(normalizeCatalogText(ingredient.name)) ||
      null
    if (match) {
      plan.increments.push({ itemId: match.id, addCount: ingredient.quantityCount })
    } else {
      plan.creates.push({
        title: ingredient.name,
        quantityCount: ingredient.quantityCount,
        canonicalProductId: ingredient.canonicalProductId,
      })
    }
  }
  return plan
}
