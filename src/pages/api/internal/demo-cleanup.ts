import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { timingSafeEqual } from 'node:crypto'
import { purgeExpiredDemoUsers } from '@/lib/demo'
import { sweepExpiredActivity } from '@/lib/activity'
import { prisma } from '@/lib/prisma'
import { sweepExpiredPushEvents } from '@/lib/push'
import { sweepExpiredCounters } from '@/lib/rate-limit-store'

/**
 * How long processed Stripe webhook ids stay in the idempotency ledger.
 * Stripe stops retrying an event after 3 days, so anything older can never
 * be redelivered; 90 days keeps a generous audit window without letting the
 * table grow forever.
 */
const BILLING_EVENT_RETENTION_DAYS = 90

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.DEMO_CLEANUP_SECRET?.trim()
  const header = req.headers.authorization
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !supplied) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const purged = await purgeExpiredDemoUsers(200)
    // Rate-limit windows that have elapsed are dead rows. Swept here rather than
    // in their own worker: both are low-frequency housekeeping on the same
    // schedule, and one container is enough.
    const sweptCounters = await sweepExpiredCounters()
    const { count: sweptBillingEvents } = await prisma.billingEvent.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - BILLING_EVENT_RETENTION_DAYS * 24 * 3600 * 1000) } },
    })
    const sweptPushEvents = await sweepExpiredPushEvents()
    const sweptActivity = await sweepExpiredActivity()
    return res.status(200).json({ purged, sweptCounters, sweptBillingEvents, sweptPushEvents, sweptActivity })
  } catch (error) {
    console.error('[demo-cleanup] purge failed', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Demo cleanup failed' })
  }
}

export default withApiHandler(handler)
