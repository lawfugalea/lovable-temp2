import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import { RECIPE_NAME_MAX, serializeRecipe, validateIngredients } from '@/lib/meals'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  const recipeId = typeof req.query.id === 'string' ? req.query.id : ''
  const existing = await prisma.recipe.findFirst({ where: { id: recipeId, householdId }, select: { id: true } })
  if (!existing) return res.status(404).json({ error: 'Recipe not found' })

  if (req.method === 'DELETE') {
    await prisma.recipe.delete({ where: { id: existing.id } })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const body = (req.body || {}) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name || name.length > RECIPE_NAME_MAX) {
        return res.status(400).json({ error: `Recipe name is required (max ${RECIPE_NAME_MAX} characters)` })
      }
      data.name = name
    }
    if (body.servings !== undefined) {
      if (!Number.isInteger(body.servings) || (body.servings as number) < 1 || (body.servings as number) > 50) {
        return res.status(400).json({ error: 'Servings must be between 1 and 50' })
      }
      data.servings = body.servings
    }
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null
    }

    let ingredients: ReturnType<typeof validateIngredients> | null = null
    if (body.ingredients !== undefined) {
      ingredients = validateIngredients(body.ingredients)
      if (!ingredients.ok) return res.status(400).json({ error: ingredients.error })
    }
    if (!Object.keys(data).length && !ingredients) return res.status(400).json({ error: 'Nothing to update' })

    try {
      const recipe = await prisma.$transaction(async tx => {
        if (ingredients && ingredients.ok) {
          await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } })
          await tx.recipeIngredient.createMany({
            data: ingredients.ingredients.map((ingredient, index) => ({
              ...ingredient,
              recipeId: existing.id,
              sortOrder: index,
            })),
          })
        }
        return tx.recipe.update({ where: { id: existing.id }, data, include: { ingredients: true } })
      })
      return res.status(200).json({ recipe: serializeRecipe(recipe) })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ error: 'A recipe with this name already exists' })
      }
      throw error
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
