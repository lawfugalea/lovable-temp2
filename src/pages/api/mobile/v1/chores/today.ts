import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileTodayChoresResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { isDateOnly } from '@/lib/chore-recurrence'
import { buildTodayView } from '@/lib/chores'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileTodayChoresResponse | MobileApiError>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : ''
  const date = typeof req.query.date === 'string' ? req.query.date : ''
  if (!householdId || !isDateOnly(date)) return res.status(400).json({ error: 'A household and valid date are required' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Forbidden: not a member' })
  const items = await buildTodayView(householdId, date)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    householdId,
    date,
    items: items.map(item => ({
      id: item.chore.id,
      title: item.chore.title,
      notes: item.chore.notes,
      schedule: item.chore.schedule,
      assigneeName: item.chore.assignee?.name ?? null,
      dueDate: item.dueDate,
      overdue: item.overdue,
      status: item.status,
      completedByName: item.completedBy?.name ?? null,
    })),
  })
}

export default withApiHandler(handler)
