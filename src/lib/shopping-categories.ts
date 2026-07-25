export const SHOPPING_CATEGORIES = [
  { key: 'fruit_veg', label: 'Fruit & Veg' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'meat_fish', label: 'Meat & Fish' },
  { key: 'chilled_dairy', label: 'Chilled & Dairy' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'household', label: 'Household' },
  { key: 'personal_care', label: 'Personal Care' },
  { key: 'baby_pet', label: 'Baby & Pet' },
  { key: 'other', label: 'Other' },
] as const

export type ShoppingCategoryKey = (typeof SHOPPING_CATEGORIES)[number]['key']

export const DEFAULT_SHOPPING_CATEGORY_ORDER: ShoppingCategoryKey[] = SHOPPING_CATEGORIES.map(item => item.key)

const CATEGORY_KEYS = new Set<string>(DEFAULT_SHOPPING_CATEGORY_ORDER)
const CATEGORY_LABELS = new Map<ShoppingCategoryKey, string>(SHOPPING_CATEGORIES.map(item => [item.key, item.label]))

export function isShoppingCategory(value: unknown): value is ShoppingCategoryKey {
  return typeof value === 'string' && CATEGORY_KEYS.has(value)
}

export function shoppingCategoryLabel(value: unknown): string {
  return CATEGORY_LABELS.get(isShoppingCategory(value) ? value : 'other') || 'Other'
}

/** Keep valid unique keys, then append every missing category in the default route. */
export function normalizeShoppingCategoryOrder(value: unknown): ShoppingCategoryKey[] {
  const supplied = Array.isArray(value) ? value.filter(isShoppingCategory) : []
  const unique = supplied.filter((key, index) => supplied.indexOf(key) === index)
  return [...unique, ...DEFAULT_SHOPPING_CATEGORY_ORDER.filter(key => !unique.includes(key))]
}

export function normalizeShoppingItemCategory(value: unknown): ShoppingCategoryKey {
  return isShoppingCategory(value) ? value : 'other'
}
