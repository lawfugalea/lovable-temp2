import { prisma } from './prisma'
import { dateOnlyToDb, dbDateToDateOnly, isDateOnly } from './chore-recurrence'
import { aggregateIngredients, type PlanIngredient } from './meal-planning'

export const RECIPE_NAME_MAX = 120
export const INGREDIENT_NAME_MAX = 200
export const INGREDIENT_UNIT_MAX = 20
export const MAX_INGREDIENTS = 50
export const MAX_PLAN_RANGE_DAYS = 31

export interface IngredientInput {
  name: string
  quantity: number
  unit: string | null
  canonicalProductId: string | null
}

export type ValidatedIngredients =
  | { ok: true; ingredients: IngredientInput[] }
  | { ok: false; error: string }

export function validateIngredients(value: unknown): ValidatedIngredients {
  if (!Array.isArray(value)) return { ok: false, error: 'Ingredients must be a list' }
  if (value.length > MAX_INGREDIENTS) return { ok: false, error: `A recipe can have at most ${MAX_INGREDIENTS} ingredients` }
  const ingredients: IngredientInput[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') return { ok: false, error: 'Invalid ingredient' }
    const record = row as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!name) continue
    if (name.length > INGREDIENT_NAME_MAX) return { ok: false, error: `Ingredient names are limited to ${INGREDIENT_NAME_MAX} characters` }
    const quantity = Number(record.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) {
      return { ok: false, error: `"${name}" needs a quantity between 0 and 10000` }
    }
    const unit = typeof record.unit === 'string' && record.unit.trim() ? record.unit.trim().slice(0, INGREDIENT_UNIT_MAX) : null
    const canonicalProductId = typeof record.canonicalProductId === 'string' && record.canonicalProductId ? record.canonicalProductId : null
    ingredients.push({ name, quantity, unit, canonicalProductId })
  }
  if (!ingredients.length) return { ok: false, error: 'Add at least one ingredient' }
  return { ok: true, ingredients }
}

export function parsePlanRange(fromRaw: unknown, toRaw: unknown): { from: string; to: string } | null {
  const from = typeof fromRaw === 'string' ? fromRaw : ''
  const to = typeof toRaw === 'string' ? toRaw : ''
  if (!isDateOnly(from) || !isDateOnly(to) || from > to) return null
  const days = (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000
  if (days > MAX_PLAN_RANGE_DAYS) return null
  return { from, to }
}

export interface RecipeRow {
  id: string
  name: string
  servings: number
  notes: string | null
  ingredients: Array<{
    id: string
    name: string
    quantity: unknown
    unit: string | null
    canonicalProductId: string | null
    sortOrder: number
  }>
}

export function serializeRecipe(recipe: RecipeRow) {
  return {
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    notes: recipe.notes,
    ingredients: [...recipe.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit,
        canonicalProductId: ingredient.canonicalProductId,
      })),
  }
}

/** All ingredients from recipes planned in [from, to], aggregated for shopping. */
export async function aggregatePlannedIngredients(householdId: string, from: string, to: string) {
  const entries = await prisma.mealPlanEntry.findMany({
    where: { householdId, date: { gte: dateOnlyToDb(from), lte: dateOnlyToDb(to) }, recipeId: { not: null } },
    select: {
      recipe: {
        select: {
          ingredients: { select: { name: true, quantity: true, unit: true, canonicalProductId: true } },
        },
      },
    },
  })
  const ingredients: PlanIngredient[] = entries.flatMap(entry =>
    (entry.recipe?.ingredients || []).map(ingredient => ({
      name: ingredient.name,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      canonicalProductId: ingredient.canonicalProductId,
    })),
  )
  return { aggregated: aggregateIngredients(ingredients), plannedRecipeCount: entries.length }
}

export function planEntryDate(value: Date): string {
  return dbDateToDateOnly(value)
}
