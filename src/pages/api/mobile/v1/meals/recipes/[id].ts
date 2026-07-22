import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileSaveRecipeRequest, MobileSaveRecipeResponse } from '../../../../../../../packages/contracts'
import { Prisma } from '@prisma/client'
import { withApiHandler } from '@/lib/api-handler'
import { RECIPE_NAME_MAX, serializeRecipe, validateIngredients } from '@/lib/meals'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileSaveRecipeResponse | MobileApiError | { ok: true }

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') { res.setHeader('Allow', ['PATCH', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const body = (req.body || {}) as Partial<MobileSaveRecipeRequest>
  const householdId = body.householdId || ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const existing = await prisma.recipe.findFirst({ where: { id, householdId }, select: { id: true, ingredients: { select: { id: true, canonicalProductId: true } } } })
  if (!existing) return res.status(404).json({ error: 'Recipe not found' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'DELETE') { await prisma.recipe.delete({ where: { id } }); return res.status(200).json({ ok: true }) }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > RECIPE_NAME_MAX) return res.status(400).json({ error: `Recipe name is required (max ${RECIPE_NAME_MAX} characters)` })
  if (!Number.isInteger(body.servings) || Number(body.servings) < 1 || Number(body.servings) > 50) return res.status(400).json({ error: 'Servings must be between 1 and 50' })
  const ingredients = validateIngredients(body.ingredients); if (!ingredients.ok) return res.status(400).json({ error: ingredients.error })
  const inputRows = Array.isArray(body.ingredients) ? body.ingredients.filter(row => row.name.trim()) : []
  const linksById = new Map(existing.ingredients.map(ingredient => [ingredient.id, ingredient.canonicalProductId]))
  try {
    const recipe = await prisma.$transaction(async tx => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } })
      await tx.recipeIngredient.createMany({ data: ingredients.ingredients.map(({ canonicalProductId: _link, ...ingredient }, sortOrder) => { const inputId = inputRows[sortOrder]?.id; return { ...ingredient, recipeId: id, canonicalProductId: inputId && linksById.has(inputId) ? linksById.get(inputId) ?? null : null, sortOrder } }) })
      return tx.recipe.update({ where: { id }, data: { name, servings: Number(body.servings), notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : null }, include: { ingredients: true } })
    })
    const dto = serializeRecipe(recipe); return res.status(200).json({ recipe: { ...dto, ingredients: dto.ingredients.map(({ canonicalProductId: _link, ...ingredient }) => ingredient) } })
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'A recipe with this name already exists' }); throw error }
}

export default withApiHandler(handler)
