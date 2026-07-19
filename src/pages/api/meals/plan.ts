import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import { dateOnlyToDb, isDateOnly } from '@/lib/chore-recurrence'
import { parsePlanRange, planEntryDate } from '@/lib/meals'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const range = parsePlanRange(req.query.from, req.query.to)
    if (!range) return res.status(400).json({ error: 'A valid from/to range (max one month) is required' })
    const entries = await prisma.mealPlanEntry.findMany({
      where: { householdId, date: { gte: dateOnlyToDb(range.from), lte: dateOnlyToDb(range.to) } },
      include: { recipe: { select: { id: true, name: true, servings: true } } },
      orderBy: { date: 'asc' },
    })
    return res.status(200).json({
      entries: entries.map(entry => ({
        id: entry.id,
        date: planEntryDate(entry.date),
        slot: entry.slot,
        recipe: entry.recipe,
        freeText: entry.freeText,
      })),
    })
  }

  if (req.method === 'PUT') {
    const body = (req.body || {}) as Record<string, unknown>
    const date = typeof body.date === 'string' ? body.date : ''
    if (!isDateOnly(date)) return res.status(400).json({ error: 'A valid date is required' })
    const slot = 'DINNER' as const

    const recipeId = typeof body.recipeId === 'string' && body.recipeId ? body.recipeId : null
    const freeText = typeof body.freeText === 'string' && body.freeText.trim() ? body.freeText.trim().slice(0, 200) : null

    if (!recipeId && !freeText) {
      // Clearing the slot.
      await prisma.mealPlanEntry.deleteMany({ where: { householdId, date: dateOnlyToDb(date), slot } })
      return res.status(200).json({ entry: null })
    }

    if (recipeId) {
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, householdId }, select: { id: true } })
      if (!recipe) return res.status(400).json({ error: 'Recipe not found in this household' })
    }

    const entry = await prisma.mealPlanEntry.upsert({
      where: { householdId_date_slot: { householdId, date: dateOnlyToDb(date), slot } },
      create: { householdId, date: dateOnlyToDb(date), slot, recipeId, freeText: recipeId ? null : freeText },
      update: { recipeId, freeText: recipeId ? null : freeText },
      include: { recipe: { select: { id: true, name: true, servings: true } } },
    })
    return res.status(200).json({
      entry: {
        id: entry.id,
        date: planEntryDate(entry.date),
        slot: entry.slot,
        recipe: entry.recipe,
        freeText: entry.freeText,
      },
    })
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
