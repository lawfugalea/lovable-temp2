import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { choreRecurrenceFromRow, describeRecurrence } from '@/lib/chore-recurrence'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { requireMobileIdentity } from '@/lib/mobile-auth'

/**
 * Recurring shopping templates on the phone.
 *
 * Catalogue product links are deliberately not carried: mobile shopping redacts
 * retailer and catalogue metadata while supermarket comparison stays parked
 * pending written retailer consent. Templates created here are plain items, and
 * a template created on the web imports its items without their product links.
 */
function serializeTemplate(template: {
  id: string
  name: string
  createdAt: Date
  recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY' | null
  daysOfWeek: number[]
  intervalDays: number | null
  anchorDate: Date | null
  dayOfMonth: number | null
  autoListId: string | null
  // Prisma stores the quantity as a Decimal; the wire carries a plain number.
  items: Array<{ id: string; name: string; quantity: { toString(): string }; note: string | null }>
}) {
  // Reuses the chore recurrence engine, which the schema shares deliberately.
  const schedule = template.recurrenceType
    ? describeRecurrence(choreRecurrenceFromRow({
        recurrenceType: template.recurrenceType,
        daysOfWeek: template.daysOfWeek,
        intervalDays: template.intervalDays,
        anchorDate: template.anchorDate,
        dayOfMonth: template.dayOfMonth,
      }))
    : null
  return {
    id: template.id,
    name: template.name,
    createdAt: template.createdAt.toISOString(),
    autoListId: template.autoListId,
    schedule,
    items: template.items.map(item => ({ id: item.id, name: item.name, quantity: Number(item.quantity), note: item.note })),
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : '')
    : (typeof req.body?.householdId === 'string' ? req.body.householdId : '')
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Household not available' })
  }
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const templates = await prisma.shoppingTemplate.findMany({
      where: { householdId },
      include: { items: { select: { id: true, name: true, quantity: true, note: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json({ householdId, templates: templates.map(serializeTemplate) })
  }

  const body = (req.body || {}) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const rawItems = Array.isArray(body.items) ? body.items : []
  if (!name || name.length > 100 || rawItems.length === 0) {
    return res.status(400).json({ error: 'Give the template a name and at least one item' })
  }
  if (rawItems.length > 200) return res.status(400).json({ error: 'A template holds at most 200 items' })

  const items: Array<{ name: string; quantity: number; note?: string }> = []
  for (const raw of rawItems as Array<Record<string, unknown>>) {
    const itemName = typeof raw?.name === 'string' ? raw.name.trim() : ''
    const quantity = typeof raw?.quantity === 'number' ? raw.quantity : 1
    const note = typeof raw?.note === 'string' ? raw.note.trim() : ''
    if (!itemName || itemName.length > 200) return res.status(400).json({ error: 'Template contains invalid items' })
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) {
      return res.status(400).json({ error: 'Template contains invalid items' })
    }
    if (note.length > 1000) return res.status(400).json({ error: 'Template contains invalid items' })
    items.push({ name: itemName, quantity, ...(note ? { note } : {}) })
  }

  const template = await prisma.shoppingTemplate.create({
    data: { householdId, name, items: { create: items } },
    include: { items: { select: { id: true, name: true, quantity: true, note: true } } },
  })
  return res.status(201).json({ template: serializeTemplate(template) })
}

export default withApiHandler(handler)
