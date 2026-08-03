import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { timingSafeEqual } from 'node:crypto'
import { runScheduledFinanceSync } from '@/lib/finance/scheduled-sync'

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.FINANCE_SYNC_SECRET?.trim()
  const header = req.headers.authorization
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !supplied) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Unattended bank sync and consent lifecycle, polled by the finance-sync
 * worker container. Carries the same shared-secret bearer check as the other
 * internal workers. Safe to poll frequently: the module itself decides what is
 * due (roughly two syncs per connection per day, one email per episode).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  const report = await runScheduledFinanceSync()
  return res.status(200).json({ ok: true, ...report })
}

export default withApiHandler(handler)
