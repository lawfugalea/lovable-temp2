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

  if (req.method === 'GET') {
    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      include: { ingredients: true },
      orderBy: { name: 'asc' },
    })
    return res.status(200).json({ recipes: recipes.map(serializeRecipe) })
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > RECIPE_NAME_MAX) {
      return res.status(400).json({ error: `Recipe name is required (max ${RECIPE_NAME_MAX} characters)` })
    }
    const servings = Number.isInteger(body.servings) && (body.servings as number) >= 1 && (body.servings as number) <= 50
      ? (body.servings as number)
      : 4
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''
    const validated = validateIngredients(body.ingredients)
    if (!validated.ok) return res.status(400).json({ error: validated.error })

    try {
      const recipe = await prisma.recipe.create({
        data: {
          householdId,
          name,
          servings,
          notes: notes || null,
          ingredients: {
            create: validated.ingredients.map((ingredient, index) => ({ ...ingredient, sortOrder: index })),
          },
        },
        include: { ingredients: true },
      })
      return res.status(201).json({ recipe: serializeRecipe(recipe) })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ error: 'A recipe with this name already exists' })
      }
      throw error
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
