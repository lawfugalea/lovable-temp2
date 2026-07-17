import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

function dateValue(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true })
  if (!access) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const subscription = await prisma.financeSubscription.findFirst({ where: { id, userId: access.userId } })
  if (!subscription) return res.status(404).json({ error: 'Subscription not found' })
  if (req.method === 'DELETE') {
    await prisma.financeSubscription.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }
  if (req.method === 'PATCH') {
    const status = req.body?.status === undefined ? undefined : (['CANDIDATE', 'CONFIRMED', 'DISMISSED'].includes(req.body.status) ? req.body.status : null)
    const cadence = req.body?.cadence === undefined ? undefined : (['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].includes(req.body.cadence) ? req.body.cadence : null)
    if (status === null || cadence === null) return res.status(400).json({ error: 'Invalid status or cadence' })
    const displayName = req.body?.displayName === undefined ? undefined : String(req.body.displayName).trim().slice(0, 160)
    if (displayName === '') return res.status(400).json({ error: 'Name is required' })
    const nextExpectedDate = dateValue(req.body?.nextExpectedDate)
    if (req.body?.nextExpectedDate !== undefined && nextExpectedDate === undefined) return res.status(400).json({ error: 'Expected date must use YYYY-MM-DD' })
    const amount = req.body?.expectedAmount === undefined ? undefined : Number(req.body.expectedAmount)
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return res.status(400).json({ error: 'Expected amount must be positive' })
    const rawReminderDays = req.body?.reminderDays === undefined ? undefined : Number(req.body.reminderDays)
    if (rawReminderDays !== undefined && !Number.isFinite(rawReminderDays)) return res.status(400).json({ error: 'Reminder days must be a number' })
    const updated = await prisma.financeSubscription.update({
      where: { id },
      data: {
        ...(status ? { status } : {}), ...(cadence ? { cadence } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
        ...(nextExpectedDate !== undefined ? { nextExpectedDate } : {}),
        ...(amount !== undefined ? { expectedAmount: amount } : {}),
        ...(rawReminderDays !== undefined ? { reminderDays: Math.max(0, Math.min(30, Math.round(rawReminderDays))) } : {}),
      },
    })
    return res.status(200).json({ subscription: updated })
  }
  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
