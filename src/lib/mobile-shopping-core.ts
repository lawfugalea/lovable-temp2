export const MOBILE_SHOPPING_LIST_NAME_MAX = 100
export const MOBILE_SHOPPING_ITEM_TITLE_MAX = 200
export const MOBILE_SHOPPING_ITEM_QTY_MAX = 80
export const MOBILE_SHOPPING_QUANTITY_COUNT_MAX = 999

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function normalizeMobileShoppingListName(value: unknown): ValidationResult<string> {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > MOBILE_SHOPPING_LIST_NAME_MAX) {
    return { ok: false, error: 'A list name of 100 characters or fewer is required' }
  }
  return { ok: true, value: name }
}

function normalizeQuantityCount(value: unknown): ValidationResult<number> {
  if (value === undefined) return { ok: true, value: 1 }
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > MOBILE_SHOPPING_QUANTITY_COUNT_MAX) {
    return { ok: false, error: 'Quantity count must be an integer between 1 and 999' }
  }
  return { ok: true, value: Number(value) }
}

export function normalizeMobileShoppingItemCreate(value: unknown): ValidationResult<{
  title: string
  qty: string | null
  quantityCount: number
}> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const qty = typeof input.qty === 'string' ? input.qty.trim() : ''
  if (!title || title.length > MOBILE_SHOPPING_ITEM_TITLE_MAX) {
    return { ok: false, error: 'An item name of 200 characters or fewer is required' }
  }
  if (qty.length > MOBILE_SHOPPING_ITEM_QTY_MAX) {
    return { ok: false, error: 'Quantity is too long' }
  }
  const count = normalizeQuantityCount(input.quantityCount)
  if (!count.ok) return count
  return { ok: true, value: { title, qty: qty || null, quantityCount: count.value } }
}

export function normalizeMobileShoppingItemPatch(value: unknown): ValidationResult<{
  title?: string
  qty?: string | null
  quantityCount?: number
  status?: 'ACTIVE' | 'DONE'
}> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const patch: { title?: string; qty?: string | null; quantityCount?: number; status?: 'ACTIVE' | 'DONE' } = {}

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title || title.length > MOBILE_SHOPPING_ITEM_TITLE_MAX) {
      return { ok: false, error: 'An item name of 200 characters or fewer is required' }
    }
    patch.title = title
  }
  if (Object.prototype.hasOwnProperty.call(input, 'qty')) {
    if (input.qty !== null && typeof input.qty !== 'string') return { ok: false, error: 'Invalid quantity' }
    const qty = typeof input.qty === 'string' ? input.qty.trim() : ''
    if (qty.length > MOBILE_SHOPPING_ITEM_QTY_MAX) return { ok: false, error: 'Quantity is too long' }
    patch.qty = qty || null
  }
  if (Object.prototype.hasOwnProperty.call(input, 'quantityCount')) {
    const count = normalizeQuantityCount(input.quantityCount)
    if (!count.ok) return count
    patch.quantityCount = count.value
  }
  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    if (input.status !== 'ACTIVE' && input.status !== 'DONE') return { ok: false, error: 'Invalid item status' }
    patch.status = input.status
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'No supported changes supplied' }
  return { ok: true, value: patch }
}
