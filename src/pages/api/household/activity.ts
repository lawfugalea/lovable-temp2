import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'

const PAGE_SIZE = 30

/** The household activity feed, newest first. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const membership = await requireMembershipIn(req, res, householdId)
  if (!membership) return

  const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null
  const events = await prisma.activityEvent.findMany({
    where: {
      householdId,
      ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      module: true,
      action: true,
      summary: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  })

  const page = events.slice(0, PAGE_SIZE)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    events: page.map(event => ({
      id: event.id,
      module: event.module,
      action: event.action,
      summary: event.summary,
      createdAt: event.createdAt.toISOString(),
      actor: event.user ? { id: event.user.id, name: event.user.name } : null,
    })),
    nextBefore: events.length > PAGE_SIZE ? page[page.length - 1].createdAt.toISOString() : null,
  })
}

export default withApiHandler(handler)
