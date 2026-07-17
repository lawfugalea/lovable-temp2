import type { NextApiRequest, NextApiResponse } from 'next'
import { timingSafeEqual } from 'node:crypto'
import { dispatchMedicinePush } from '@/lib/medicine-push'

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.REMINDER_WORKER_SECRET?.trim()
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
    return res.status(200).json(await dispatchMedicinePush())
  } catch (error) {
    console.error('[medicine-reminders] dispatch failed', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Reminder dispatch failed' })
  }
}
