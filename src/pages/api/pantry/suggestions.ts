import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import { normalizePantryName, pantryNameSet } from '@/lib/pantry'

const MAX_SUGGESTIONS = 5

/**
 * "Cook from your pantry": recipes ranked by how much of their ingredient
 * list the household already has, best coverage first. Only recipes with at
 * least one pantry match appear — an empty pantry suggests nothing.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'private, no-store')

  const pantry = await pantryNameSet(householdId)
  if (!pantry.size) return res.status(200).json({ suggestions: [] })

  const recipes = await prisma.recipe.findMany({
    where: { householdId, ingredients: { some: {} } },
    select: {
      id: true,
      name: true,
      servings: true,
      ingredients: { select: { name: true } },
    },
  })

  const suggestions = recipes
    .map(recipe => {
      const total = recipe.ingredients.length
      const matched = recipe.ingredients.filter(
        ingredient => pantry.has(normalizePantryName(ingredient.name)),
      ).length
      return {
        recipeId: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        matched,
        total,
        missing: recipe.ingredients
          .filter(ingredient => !pantry.has(normalizePantryName(ingredient.name)))
          .map(ingredient => ingredient.name)
          .slice(0, 5),
      }
    })
    .filter(entry => entry.matched > 0)
    .sort((left, right) =>
      right.matched / right.total - left.matched / left.total
      || right.matched - left.matched
      || left.name.localeCompare(right.name))
    .slice(0, MAX_SUGGESTIONS)

  return res.status(200).json({ suggestions })
}

export default withApiHandler(handler)
