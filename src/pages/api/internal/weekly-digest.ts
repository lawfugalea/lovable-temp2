import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { timingSafeEqual } from 'node:crypto'
import { dispatchWeeklyDigest } from '@/lib/weekly-digest'

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.WEEKLY_DIGEST_SECRET?.trim()
  const header = req.headers.authorization
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !supplied) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Monday household digest emails, polled hourly by the digest worker with the
 * same shared-secret bearer pattern as the other internal workers. The module
 * gates on local Monday morning and claims a per-household weekly ledger key,
 * so the poll frequency does not matter.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  const report = await dispatchWeeklyDigest()
  return res.status(200).json({ ok: true, ...report })
}

export default withApiHandler(handler)
