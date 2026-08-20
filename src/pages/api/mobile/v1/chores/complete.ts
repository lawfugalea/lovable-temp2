import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileCompleteChoreRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { choreRecurrenceFromRow, dateOnlyToDb, isDateOnly, isDueOn } from '@/lib/chore-recurrence'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | MobileApiError>) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const body = (req.body || {}) as Partial<MobileCompleteChoreRequest>
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  const choreId = typeof body.choreId === 'string' ? body.choreId : ''
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate : ''
  if (!householdId || !choreId || !isDateOnly(dueDate)) return res.status(400).json({ error: 'A household, chore, and valid due date are required' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Forbidden: not a member' })
  const chore = await prisma.chore.findFirst({ where: { id: choreId, householdId, active: true } })
  if (!chore) return res.status(404).json({ error: 'Chore not found' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'DELETE') {
    await prisma.choreCompletion.deleteMany({ where: { choreId, dueDate: dateOnlyToDb(dueDate) } })
    return res.status(200).json({ ok: true })
  }
  if (!isDueOn(choreRecurrenceFromRow(chore), dueDate)) return res.status(400).json({ error: 'This chore is not scheduled on that date' })
  const status = body.status === 'SKIPPED' ? 'SKIPPED' : 'DONE'
  await prisma.choreCompletion.upsert({
    where: { choreId_dueDate: { choreId, dueDate: dateOnlyToDb(dueDate) } },
    create: { choreId, dueDate: dateOnlyToDb(dueDate), status, completedById: identity.userId },
    update: { status, completedById: identity.userId, completedAt: new Date() },
  })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
