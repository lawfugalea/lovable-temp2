import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileRecipesResponse, MobileSaveRecipeRequest, MobileSaveRecipeResponse } from '../../../../../../../packages/contracts'
import { Prisma } from '@prisma/client'
import { withApiHandler } from '@/lib/api-handler'
import { RECIPE_NAME_MAX, serializeRecipe, validateIngredients } from '@/lib/meals'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileRecipesResponse | MobileSaveRecipeResponse | MobileApiError

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveRecipeRequest>
  const householdId = req.method === 'GET' ? (typeof req.query.householdId === 'string' ? req.query.householdId : '') : body.householdId || ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const recipes = await prisma.recipe.findMany({ where: { householdId }, include: { ingredients: true }, orderBy: { name: 'asc' } })
    return res.status(200).json({ householdId, recipes: recipes.map(serializeRecipe).map(recipe => ({ ...recipe, ingredients: recipe.ingredients.map(({ canonicalProductId: _link, ...ingredient }) => ingredient) })) })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > RECIPE_NAME_MAX) return res.status(400).json({ error: `Recipe name is required (max ${RECIPE_NAME_MAX} characters)` })
  const servings = Number.isInteger(body.servings) && Number(body.servings) >= 1 && Number(body.servings) <= 50 ? Number(body.servings) : 4
  const ingredients = validateIngredients(body.ingredients); if (!ingredients.ok) return res.status(400).json({ error: ingredients.error })
  try {
    const recipe = await prisma.recipe.create({ data: { householdId, name, servings, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : null, ingredients: { create: ingredients.ingredients.map(({ canonicalProductId: _link, ...ingredient }, sortOrder) => ({ ...ingredient, canonicalProductId: null, sortOrder })) } }, include: { ingredients: true } })
    const dto = serializeRecipe(recipe); return res.status(201).json({ recipe: { ...dto, ingredients: dto.ingredients.map(({ canonicalProductId: _link, ...ingredient }) => ingredient) } })
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'A recipe with this name already exists' }); throw error }
}

export default withApiHandler(handler)
