import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  MobileApiError,
  MobileMealPlanEntry,
  MobileMealWeekResponse,
  MobileUpdateMealPlanRequest,
  MobileUpdateMealPlanResponse,
} from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { dateOnlyToDb, isDateOnly } from '@/lib/chore-recurrence'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { parsePlanRange, planEntryDate } from '@/lib/meals'
import { prisma } from '@/lib/prisma'

type Response = MobileMealWeekResponse | MobileUpdateMealPlanResponse | MobileApiError

function entryDto(entry: {
  id: string
  date: Date
  recipe: { id: string; name: string; servings: number } | null
  freeText: string | null
}): MobileMealPlanEntry {
  return { id: entry.id, date: planEntryDate(entry.date), recipe: entry.recipe, freeText: entry.freeText }
}

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const body = (req.body || {}) as Partial<MobileUpdateMealPlanRequest>
  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : '')
    : (typeof body.householdId === 'string' ? body.householdId : '')
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Forbidden: not a member' })
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const range = parsePlanRange(req.query.from, req.query.to)
    if (!range) return res.status(400).json({ error: 'A valid from/to range (max one month) is required' })
    const [entries, recipes] = await Promise.all([
      prisma.mealPlanEntry.findMany({
        where: { householdId, date: { gte: dateOnlyToDb(range.from), lte: dateOnlyToDb(range.to) } },
        select: { id: true, date: true, freeText: true, recipe: { select: { id: true, name: true, servings: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.recipe.findMany({
        where: { householdId },
        select: { id: true, name: true, servings: true, _count: { select: { ingredients: true } } },
        orderBy: { name: 'asc' },
      }),
    ])
    return res.status(200).json({
      householdId, from: range.from, to: range.to,
      entries: entries.map(entryDto),
      recipes: recipes.map(recipe => ({ id: recipe.id, name: recipe.name, servings: recipe.servings, ingredientCount: recipe._count.ingredients })),
    })
  }

  const date = typeof body.date === 'string' ? body.date : ''
  if (!isDateOnly(date)) return res.status(400).json({ error: 'A valid date is required' })
  const recipeId = typeof body.recipeId === 'string' && body.recipeId ? body.recipeId : null
  const freeText = typeof body.freeText === 'string' ? body.freeText.trim() : ''
  if (freeText.length > 200) return res.status(400).json({ error: 'Meal description is limited to 200 characters' })
  if (!recipeId && !freeText) {
    await prisma.mealPlanEntry.deleteMany({ where: { householdId, date: dateOnlyToDb(date), slot: 'DINNER' } })
    return res.status(200).json({ entry: null })
  }
  if (recipeId) {
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, householdId }, select: { id: true } })
    if (!recipe) return res.status(400).json({ error: 'Recipe not found in this household' })
  }
  const entry = await prisma.mealPlanEntry.upsert({
    where: { householdId_date_slot: { householdId, date: dateOnlyToDb(date), slot: 'DINNER' } },
    create: { householdId, date: dateOnlyToDb(date), slot: 'DINNER', recipeId, freeText: recipeId ? null : freeText },
    update: { recipeId, freeText: recipeId ? null : freeText },
    select: { id: true, date: true, freeText: true, recipe: { select: { id: true, name: true, servings: true } } },
  })
  return res.status(200).json({ entry: entryDto(entry) })
}

export default withApiHandler(handler)
