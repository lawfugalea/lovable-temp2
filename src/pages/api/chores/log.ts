import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { dbDateToDateOnly } from '@/lib/chore-recurrence'
import { requireActiveHousehold } from '@/lib/chores'

const LOG_DAYS = 30
const LOG_LIMIT = 200

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return

  const since = new Date(Date.now() - LOG_DAYS * 24 * 3600 * 1000)
  const completions = await prisma.choreCompletion.findMany({
    where: { chore: { householdId }, dueDate: { gte: since } },
    include: {
      chore: { select: { id: true, title: true } },
      completedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: 'desc' }, { completedAt: 'desc' }],
    take: LOG_LIMIT,
  })

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    entries: completions.map(row => ({
      id: row.id,
      choreId: row.chore.id,
      title: row.chore.title,
      dueDate: dbDateToDateOnly(row.dueDate),
      status: row.status,
      completedBy: row.completedBy,
      completedAt: row.completedAt.toISOString(),
    })),
  })
}

export default withApiHandler(handler)
