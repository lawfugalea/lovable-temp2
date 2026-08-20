import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';
import { dateOnlyToDb, validateRecurrenceInput } from '@/lib/chore-recurrence';

/**
 * Set or clear a template's refill schedule.
 *
 * Kept off the templates collection route because the two concerns validate
 * completely differently: that one takes a name and a list of items, this one
 * takes a recurrence and a target list.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  res.setHeader('Cache-Control', 'private, no-store');

  const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : '';
  if (!templateId) return res.status(400).json({ error: 'Missing templateId' });

  // Scope by membership, not by active household: a template the user can reach
  // in one household must not be reschedulable from another.
  const template = await prisma.shoppingTemplate.findFirst({
    where: { id: templateId, household: { members: { some: { userId } } } },
    select: { id: true, householdId: true },
  });
  if (!template) return res.status(404).json({ error: 'Template not found' });

  // Clearing the schedule returns the template to manual-import-only.
  if (req.body?.recurrenceType === null || req.body?.autoListId === null) {
    const cleared = await prisma.shoppingTemplate.update({
      where: { id: template.id },
      data: {
        recurrenceType: null,
        daysOfWeek: [],
        intervalDays: null,
        anchorDate: null,
        dayOfMonth: null,
        autoListId: null,
        lastRunOn: null,
      },
      select: { id: true, recurrenceType: true, autoListId: true },
    });
    return res.status(200).json({ template: cleared });
  }

  const autoListId = typeof req.body?.autoListId === 'string' ? req.body.autoListId : '';
  if (!autoListId) return res.status(400).json({ error: 'Choose a list for this schedule to fill' });

  const list = await prisma.shoppingList.findFirst({
    where: { id: autoListId, householdId: template.householdId, archivedAt: null },
    select: { id: true },
  });
  if (!list) return res.status(400).json({ error: 'Choose an active shopping list in this household' });

  // The shared validator phrases its "no type given" case for chores; every
  // other message it returns is domain-neutral and worth passing through.
  const recurrenceType = req.body?.recurrenceType;
  if (recurrenceType !== 'WEEKLY' && recurrenceType !== 'EVERY_N_DAYS' && recurrenceType !== 'MONTHLY') {
    return res.status(400).json({ error: 'Choose how often this template refills the list' });
  }
  const validated = validateRecurrenceInput(req.body ?? {});
  if (!validated.ok) return res.status(400).json({ error: validated.error });
  const recurrence = validated.recurrence;

  const updated = await prisma.shoppingTemplate.update({
    where: { id: template.id },
    data: {
      recurrenceType: recurrence.type,
      daysOfWeek: recurrence.type === 'WEEKLY' ? recurrence.daysOfWeek : [],
      intervalDays: recurrence.type === 'EVERY_N_DAYS' ? recurrence.intervalDays : null,
      anchorDate: recurrence.type === 'EVERY_N_DAYS' ? dateOnlyToDb(recurrence.anchorDate) : null,
      dayOfMonth: recurrence.type === 'MONTHLY' ? recurrence.dayOfMonth : null,
      autoListId: list.id,
      // Cleared so a newly scheduled template can run on its next due date even
      // if it happens to be today.
      lastRunOn: null,
    },
    select: {
      id: true,
      recurrenceType: true,
      daysOfWeek: true,
      intervalDays: true,
      anchorDate: true,
      dayOfMonth: true,
      autoListId: true,
    },
  });

  return res.status(200).json({ template: updated });
}

export default withApiHandler(handler);
