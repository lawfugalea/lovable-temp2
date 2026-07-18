import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserIdOr401 } from '@/lib/api-guards'
import { isDateOnly } from '@/lib/chore-recurrence'
import { buildTodayView, requireActiveHousehold } from '@/lib/chores'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return

  // The client sends its own local date so "today" is the family's today,
  // not the server's.
  const date = typeof req.query.date === 'string' ? req.query.date : ''
  if (!isDateOnly(date)) return res.status(400).json({ error: 'A valid date is required' })

  const items = await buildTodayView(householdId, date)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ items })
}
