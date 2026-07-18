import type { NextApiRequest, NextApiResponse } from 'next'
import { timingSafeEqual } from 'node:crypto'
import { purgeExpiredDemoUsers } from '@/lib/demo'

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.DEMO_CLEANUP_SECRET?.trim()
  const header = req.headers.authorization
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !supplied) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const purged = await purgeExpiredDemoUsers(200)
    return res.status(200).json({ purged })
  } catch (error) {
    console.error('[demo-cleanup] purge failed', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Demo cleanup failed' })
  }
}
