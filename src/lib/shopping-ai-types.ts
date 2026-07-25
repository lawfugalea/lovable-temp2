import type { ShoppingCategoryKey } from './shopping-categories'

export interface ShoppingAiPayload {
  schemaVersion: 1
  privacy: string
  activeItems: Array<{
    ref: string
    title: string
    qty: string | null
    quantityCount: number
    category: ShoppingCategoryKey
  }>
  mealPlan: null | {
    from: string
    to: string
    ingredients: Array<{
      ref: string
      title: string
      qty: string | null
      quantityCount: number
    }>
  }
}

export type ShoppingAiOperation =
  | {
      id: string
      kind: 'update'
      itemId: string
      before: { title: string; qty: string | null; quantityCount: number; category: ShoppingCategoryKey }
      after: { title: string; qty: string | null; quantityCount: number; category: ShoppingCategoryKey }
      reason: string
    }
  | {
      id: string
      kind: 'merge'
      keepItemId: string
      removeItemIds: string[]
      before: Array<{ id: string; title: string; qty: string | null; quantityCount: number; category: ShoppingCategoryKey }>
      after: { title: string; qty: string | null; quantityCount: number; category: ShoppingCategoryKey }
      reason: string
    }
  | {
      id: string
      kind: 'add'
      mealRef: string
      after: { title: string; qty: string | null; quantityCount: number; category: ShoppingCategoryKey }
      reason: string
    }

export interface ShoppingAiPreviewResponse {
  configured: boolean
  inputHash: string
  payload: ShoppingAiPayload
}

export interface ShoppingAiProposalResponse {
  summary: string
  operations: ShoppingAiOperation[]
  proposalToken: string
  expiresAt: string
}

export interface ShoppingAiApplyResponse {
  applied: number
  items: unknown[]
}
