import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { dateOnlyToDb } from '@/lib/chore-recurrence'
import { withBasePath } from '@/lib/base-path'
import { recordActivity } from '@/lib/activity'
import { sendHouseholdEventPush } from '@/lib/push'
import { selectDueTemplates, type RecurringTemplateRow } from '@/lib/shopping-recurrence'

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.SHOPPING_RECURRENCE_SECRET?.trim()
  const header = req.headers.authorization
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !supplied) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Refill lists from templates scheduled for today.
 *
 * Driven by the same kind of cron container as the medicine reminder worker, so
 * it carries the same shared-secret bearer check rather than a session.
 *
 * Runs are idempotent per day: `lastRunOn` is written in the same transaction
 * that creates the items, so a retry after a crash cannot double a household's
 * weekly staples.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  // The caller supplies the date so the cron container's timezone is the single
  // source of truth, matching how the chores UI passes its own local date.
  const today = typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
    ? req.body.date
    : new Date().toLocaleDateString('en-CA')

  const candidates = await prisma.shoppingTemplate.findMany({
    where: { recurrenceType: { not: null }, autoListId: { not: null } },
    select: {
      id: true,
      recurrenceType: true,
      daysOfWeek: true,
      intervalDays: true,
      anchorDate: true,
      dayOfMonth: true,
      autoListId: true,
      lastRunOn: true,
    },
  })

  const due = selectDueTemplates(candidates as RecurringTemplateRow[], today)
  let filled = 0
  let itemsCreated = 0
  const failures: string[] = []

  for (const template of due) {
    try {
      const created = await prisma.$transaction(async tx => {
        // Re-check inside the transaction: two overlapping worker runs would
        // otherwise both pass the filter above and both insert.
        const claimed = await tx.shoppingTemplate.updateMany({
          where: {
            id: template.id,
            OR: [{ lastRunOn: null }, { lastRunOn: { lt: dateOnlyToDb(today) } }],
          },
          data: { lastRunOn: dateOnlyToDb(today) },
        })
        if (claimed.count !== 1) return null

        // The target list must still be active and in the template's household.
        const list = await tx.shoppingList.findFirst({
          where: { id: template.autoListId!, archivedAt: null },
          select: { id: true, householdId: true, name: true },
        })
        if (!list) return null

        // Scheduled items have no human author, but createdById is required.
        // The household owner stands in as the responsible account; a household
        // without one cannot attribute the rows, so it is skipped rather than
        // guessing an arbitrary member.
        const owner = await tx.membership.findFirst({
          where: { householdId: list.householdId, role: 'OWNER' },
          orderBy: { createdAt: 'asc' },
          select: { userId: true },
        })
        if (!owner) return null

        const templateItems = await tx.shoppingTemplateItem.findMany({
          where: { templateId: template.id },
          select: { name: true, quantity: true, productId: true, note: true },
        })
        if (!templateItems.length) return null

        // Anything already on the list and not yet bought is left alone: topping
        // up a staple the household has not got round to buying yet would grow
        // the quantity every week until someone noticed.
        const existing = await tx.shoppingItem.findMany({
          where: { listId: list.id, status: 'ACTIVE' },
          select: { title: true },
        })
        const present = new Set(existing.map(item => item.title.trim().toLowerCase()))
        const toCreate = templateItems.filter(item => !present.has(item.name.trim().toLowerCase()))
        if (!toCreate.length) return null

        await tx.shoppingItem.createMany({
          data: toCreate.map(item => ({
            listId: list.id,
            title: item.name,
            qty: item.quantity.toString(),
            quantityCount: Math.max(1, Math.min(999, Math.trunc(Number(item.quantity)))),
            canonicalProductId: item.productId ?? undefined,
            notes: item.note ?? undefined,
            createdById: owner.userId,
            status: 'ACTIVE' as const,
          })),
        })
        return { created: toCreate.length, householdId: list.householdId, listName: list.name }
      })

      if (created && created.created > 0) {
        filled += 1
        itemsCreated += created.created
        // Best-effort heads-up after the transaction committed. The refill is
        // once-per-day by construction; the ledger key is belt and braces
        // against a crash between commit and this send being retried.
        await sendHouseholdEventPush({
          householdId: created.householdId,
          dedupeKey: `shopping-refill:${template.id}:${today}`,
          payload: {
            body: `${created.created} item${created.created === 1 ? '' : 's'} added to ${created.listName} from your schedule`,
            tag: `shopping-refill-${template.id}-${today}`,
            url: withBasePath('/shopping'),
          },
        }).catch(error => {
          console.warn('[shopping-recurrence] refill push failed', error instanceof Error ? error.message : error)
        })
        void recordActivity({
          householdId: created.householdId,
          userId: null,
          module: 'shopping',
          action: 'refilled',
          summary: `${created.created} item${created.created === 1 ? '' : 's'} added to ${created.listName} from the weekly schedule`,
          targetId: template.id,
        })
      }
    } catch (error) {
      // One broken template must not stop the rest of the households.
      failures.push(template.id)
      console.error('[shopping-recurrence] template failed', template.id, error instanceof Error ? error.message : error)
    }
  }

  return res.status(200).json({ date: today, considered: due.length, filled, itemsCreated, failures })
}

export default withApiHandler(handler)
