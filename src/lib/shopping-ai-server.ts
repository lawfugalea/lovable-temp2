import { prisma } from './prisma'
import { getHouseholdEntitlements } from './entitlements'
import { isDeepSeekConfigured } from './finance/deepseek'
import { aggregatePlannedIngredients, parsePlanRange } from './meals'
import { parseShoppingAiResult, requestShoppingAi, shoppingAiHash, shoppingListFingerprint, signShoppingAiProposal, verifyShoppingAiProposal, type ShoppingAiMealIngredient, type ShoppingAiSourceItem } from './shopping-ai'
import { normalizeShoppingItemCategory } from './shopping-categories'
import type { ShoppingAiPayload, ShoppingAiProposalResponse } from './shopping-ai-types'

export class ShoppingAiHttpError extends Error { constructor(message: string, public status = 400, public code?: string) { super(message) } }
type RangeInput = { from?: unknown; to?: unknown }
const attempts = new Map<string, number[]>()
function assertGenerationAllowed(userId: string) { const since = Date.now() - 3_600_000; const recent = (attempts.get(userId) || []).filter(time => time >= since); if (recent.length >= 3) throw new ShoppingAiHttpError('AI tidying is limited to three new requests per hour', 429, 'rate_limited'); attempts.set(userId, recent) }
function recordGeneration(userId: string) { attempts.set(userId, [...(attempts.get(userId) || []), Date.now()]) }
function selectedWeek(input: RangeInput): { from: string; to: string } | null { if (input.from === undefined && input.to === undefined) return null; const range = parsePlanRange(input.from, input.to); if (!range) throw new ShoppingAiHttpError('Choose a valid meal-plan week'); const days = (Date.parse(`${range.to}T12:00:00Z`) - Date.parse(`${range.from}T12:00:00Z`)) / 86_400_000; if (days !== 6) throw new ShoppingAiHttpError('Meal context must cover exactly seven days'); return range }
async function requireAccess(userId: string, listId: string) {
  if (!listId) throw new ShoppingAiHttpError('Choose an active shopping list')
  const list = await prisma.shoppingList.findUnique({ where: { id: listId }, select: { id: true, householdId: true, archivedAt: true } }); if (!list) throw new ShoppingAiHttpError('Shopping list not found', 404)
  const membership = await prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId: list.householdId } }, select: { id: true } }); if (!membership) throw new ShoppingAiHttpError('You cannot access this shopping list', 403); if (list.archivedAt) throw new ShoppingAiHttpError('Restore this list before tidying it')
  const entitlements = await getHouseholdEntitlements(list.householdId); if (!entitlements.canUseAi) throw new ShoppingAiHttpError('AI features are part of the Family plan', 403, 'upgrade_required'); return list
}
function ingredientQty(total: number, unit: string | null): string | null { const amount = Number(total.toFixed(2)).toString(); return unit ? `${amount} ${unit}` : amount === '1' ? null : amount }
export async function buildShoppingAiContext(userId: string, listId: string, rangeInput: RangeInput) {
  const list = await requireAccess(userId, listId)
  const items = await prisma.shoppingItem.findMany({ where: { listId, status: 'ACTIVE' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, title: true, qty: true, quantityCount: true, category: true, notes: true, store: true, canonicalProductId: true, updatedAt: true } }) as ShoppingAiSourceItem[]
  if (items.length > 150) throw new ShoppingAiHttpError('AI tidying supports lists with up to 150 active items')
  const range = selectedWeek(rangeInput); let mealIngredients: ShoppingAiMealIngredient[] = []
  if (range) { const planned = await aggregatePlannedIngredients(list.householdId, range.from, range.to); mealIngredients = planned.aggregated.slice(0, 150).map((ingredient, index) => ({ ref: `meal-${index + 1}`, title: ingredient.name.trim().slice(0, 200), qty: ingredientQty(ingredient.totalQuantity, ingredient.unit), quantityCount: Math.min(999, ingredient.quantityCount) })) }
  if (!items.length && !mealIngredients.length) throw new ShoppingAiHttpError('Add an item or select a week with planned recipe ingredients first')
  const payload: ShoppingAiPayload = { schemaVersion: 1, privacy: 'Selected active shopping text and optional selected meal ingredients only. No people, completed history, retailer, catalogue or price data.', activeItems: items.map((item, index) => ({ ref: `item-${index + 1}`, title: item.title, qty: item.qty, quantityCount: item.quantityCount, category: normalizeShoppingItemCategory(item.category) })), mealPlan: range ? { from: range.from, to: range.to, ingredients: mealIngredients } : null }
  return { list, items, mealIngredients, payload, inputHash: shoppingAiHash(payload), fingerprint: shoppingListFingerprint(items) }
}
export async function previewShoppingAi(userId: string, listId: string, range: RangeInput) { const context = await buildShoppingAiContext(userId, listId, range); return { configured: isDeepSeekConfigured(), inputHash: context.inputHash, payload: context.payload } }
export async function generateShoppingAiProposal(userId: string, listId: string, range: RangeInput, suppliedHash: unknown): Promise<ShoppingAiProposalResponse> {
  if (!isDeepSeekConfigured()) throw new ShoppingAiHttpError('AI tidying is not configured on this deployment', 503, 'ai_unavailable')
  const context = await buildShoppingAiContext(userId, listId, range); if (typeof suppliedHash !== 'string' || suppliedHash !== context.inputHash) throw new ShoppingAiHttpError('The list changed after privacy review. Review the updated payload.', 409, 'stale_preview')
  assertGenerationAllowed(userId); const raw = await requestShoppingAi(context.payload); const result = parseShoppingAiResult(raw, context.items, context.mealIngredients); recordGeneration(userId)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); const proposalToken = signShoppingAiProposal({ version: 1, userId, householdId: context.list.householdId, listId, fingerprint: context.fingerprint, inputHash: context.inputHash, expiresAt, operations: result.operations }); return { ...result, proposalToken, expiresAt }
}
export async function applyShoppingAiProposal(userId: string, tokenValue: unknown, operationIds: unknown) {
  const token = verifyShoppingAiProposal(tokenValue); if (!token || token.userId !== userId) throw new ShoppingAiHttpError('This AI proposal is invalid or has expired', 409, 'invalid_proposal'); const list = await requireAccess(userId, token.listId); if (list.householdId !== token.householdId) throw new ShoppingAiHttpError('This AI proposal is invalid or has expired', 409, 'invalid_proposal')
  const selected = Array.isArray(operationIds) ? [...new Set(operationIds.filter((id): id is string => typeof id === 'string'))] : []; const byId = new Map(token.operations.map(operation => [operation.id, operation])); if (!selected.length || selected.some(id => !byId.has(id))) throw new ShoppingAiHttpError('Select at least one valid change')
  await prisma.$transaction(async tx => { const current = await tx.shoppingItem.findMany({ where: { listId: token.listId, status: 'ACTIVE' }, select: { id: true, title: true, qty: true, quantityCount: true, category: true, notes: true, store: true, canonicalProductId: true, updatedAt: true } }) as ShoppingAiSourceItem[]; if (shoppingListFingerprint(current) !== token.fingerprint) throw new ShoppingAiHttpError('This list changed while the proposal was open. Run AI tidy again.', 409, 'stale_proposal'); for (const id of selected) { const operation = byId.get(id)!; if (operation.kind === 'update') await tx.shoppingItem.update({ where: { id: operation.itemId }, data: operation.after }); else if (operation.kind === 'merge') { await tx.shoppingItem.update({ where: { id: operation.keepItemId }, data: operation.after }); await tx.shoppingItem.deleteMany({ where: { id: { in: operation.removeItemIds }, listId: token.listId, status: 'ACTIVE' } }) } else await tx.shoppingItem.create({ data: { listId: token.listId, createdById: userId, ...operation.after } }) } }, { isolationLevel: 'Serializable' })
  return { applied: selected.length }
}
