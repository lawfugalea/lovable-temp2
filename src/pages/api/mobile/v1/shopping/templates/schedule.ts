import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { dateOnlyToDb, validateRecurrenceInput } from '@/lib/chore-recurrence'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { requireMobileIdentity } from '@/lib/mobile-auth'

/**
 * Set or clear a template's refill schedule. Mirrors the browser route,
 * including reusing the chore recurrence validator the schema shares
 * deliberately, so the two clients cannot accept different schedules.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return

  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Household not available' })
  }
  const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : ''
  if (!templateId) return res.status(400).json({ error: 'Missing templateId' })

  const template = await prisma.shoppingTemplate.findFirst({ where: { id: templateId, householdId }, select: { id: true } })
  if (!template) return res.status(404).json({ error: 'Template not found' })

  const autoListId = typeof req.body?.autoListId === 'string' ? req.body.autoListId : ''

  // No list means "stop refilling", which is how every template behaved before
  // scheduling existed.
  if (!autoListId) {
    await prisma.shoppingTemplate.update({
      where: { id: template.id },
      data: { recurrenceType: null, daysOfWeek: [], intervalDays: null, anchorDate: null, dayOfMonth: null, autoListId: null, lastRunOn: null },
    })
    return res.status(200).json({ ok: true, scheduled: false })
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id: autoListId, householdId, archivedAt: null },
    select: { id: true },
  })
  if (!list) return res.status(400).json({ error: 'Choose an active shopping list in this household' })

  const recurrenceType = req.body?.recurrenceType
  if (recurrenceType !== 'WEEKLY' && recurrenceType !== 'EVERY_N_DAYS' && recurrenceType !== 'MONTHLY') {
    return res.status(400).json({ error: 'Choose how often this template refills the list' })
  }
  const validated = validateRecurrenceInput(req.body ?? {})
  if (!validated.ok) return res.status(400).json({ error: validated.error })
  const recurrence = validated.recurrence

  await prisma.shoppingTemplate.update({
    where: { id: template.id },
    data: {
      recurrenceType: recurrence.type,
      daysOfWeek: recurrence.type === 'WEEKLY' ? recurrence.daysOfWeek : [],
      intervalDays: recurrence.type === 'EVERY_N_DAYS' ? recurrence.intervalDays : null,
      anchorDate: recurrence.type === 'EVERY_N_DAYS' ? dateOnlyToDb(recurrence.anchorDate) : null,
      dayOfMonth: recurrence.type === 'MONTHLY' ? recurrence.dayOfMonth : null,
      autoListId: list.id,
      // Cleared so a newly scheduled template can run on its next due date even
      // if that happens to be today.
      lastRunOn: null,
    },
  })
  return res.status(200).json({ ok: true, scheduled: true })
}

export default withApiHandler(handler)
