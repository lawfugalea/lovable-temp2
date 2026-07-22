import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileDashboardResponse } from '../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'
import { buildTodayView } from '@/lib/chores'

function dateOnlyInMalta(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Malta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

async function handler(req: NextApiRequest, res: NextApiResponse<MobileDashboardResponse | { error: string; code?: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const requestedHouseholdId = typeof req.query.householdId === 'string' ? req.query.householdId : null
  const user = await prisma.user.findUnique({ where: { id: identity.userId }, select: { activeHouseholdId: true } })
  const householdId = requestedHouseholdId || user?.activeHouseholdId
  if (!householdId) return res.status(404).json({ error: 'No household' })
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId: identity.userId, householdId } },
    select: { role: true, household: { select: { id: true, name: true, country: true } } },
  })
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member' })

  const today = dateOnlyInMalta()
  const todayDate = new Date(`${today}T00:00:00.000Z`)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const [activeItems, lists, chores, activeCourses, dosesLastSevenDays, tonight] = await Promise.all([
    prisma.shoppingItem.count({ where: { list: { householdId, archivedAt: null }, status: 'ACTIVE' } }),
    prisma.shoppingList.count({ where: { householdId, archivedAt: null } }),
    buildTodayView(householdId, today),
    prisma.medicine.count({ where: { householdId, isActive: true, isTemplate: false } }),
    prisma.medicineDose.count({ where: { medicine: { householdId }, takenAt: { gte: sevenDaysAgo } } }),
    prisma.mealPlanEntry.findUnique({
      where: { householdId_date_slot: { householdId, date: todayDate, slot: 'DINNER' } },
      select: { freeText: true, recipe: { select: { name: true } } },
    }),
  ])
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    household: { ...membership.household, role: membership.role },
    generatedAt: new Date().toISOString(),
    shopping: { activeItems, lists },
    chores: {
      dueToday: chores.length,
      completedToday: chores.filter(item => item.status === 'DONE').length,
    },
    medicine: { activeCourses, dosesLastSevenDays },
    meals: { tonight: tonight?.recipe?.name || tonight?.freeText || null },
  })
}

export default withApiHandler(handler)
