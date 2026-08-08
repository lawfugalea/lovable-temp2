import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { requireMobileIdentity } from '@/lib/mobile-auth'

/**
 * Fill a shopping list from a template.
 *
 * Catalogue product links are deliberately dropped: a template created on the
 * web may carry them, but mobile shopping redacts retailer and catalogue
 * metadata while supermarket comparison stays parked. The item's text, quantity
 * and note are what the household actually needs at the shop.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return

  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Household not available' })
  }
  const listId = typeof req.body?.listId === 'string' ? req.body.listId : ''
  const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : ''
  if (!listId || !templateId) return res.status(400).json({ error: 'Choose a list and a template' })

  const selectedItems = Array.isArray(req.body?.selectedItems)
    ? (req.body.selectedItems as unknown[]).filter((id): id is string => typeof id === 'string')
    : []

  const [list, template] = await Promise.all([
    prisma.shoppingList.findFirst({ where: { id: listId, householdId, archivedAt: null }, select: { id: true } }),
    prisma.shoppingTemplate.findFirst({ where: { id: templateId, householdId }, select: { id: true } }),
  ])
  if (!list) return res.status(404).json({ error: 'Shopping list not found' })
  if (!template) return res.status(404).json({ error: 'Template not found in this household' })

  const templateItems = await prisma.shoppingTemplateItem.findMany({
    where: { templateId, ...(selectedItems.length ? { id: { in: selectedItems } } : {}) },
    select: { name: true, quantity: true, note: true },
  })
  if (!templateItems.length) return res.status(400).json({ error: 'No items found to import' })

  await prisma.shoppingItem.createMany({
    data: templateItems.map(item => ({
      listId: list.id,
      title: item.name,
      qty: item.quantity.toString(),
      quantityCount: Math.max(1, Math.min(999, Math.trunc(Number(item.quantity)))),
      notes: item.note || undefined,
      createdById: identity.userId,
      status: 'ACTIVE' as const,
    })),
  })

  res.setHeader('Cache-Control', 'no-store')
  return res.status(201).json({ imported: templateItems.length })
}

export default withApiHandler(handler)
