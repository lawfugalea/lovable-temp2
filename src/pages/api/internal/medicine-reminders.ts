import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { timingSafeEqual } from 'node:crypto'
import { dispatchChoreReminderPush } from '@/lib/chore-push'
import { dispatchMedicinePush } from '@/lib/medicine-push'
import { markReminderRun } from '@/lib/reminder-heartbeat'

let warnedNoVapid = false

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.REMINDER_WORKER_SECRET?.trim()
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
  if (!process.env.VAPID_PRIVATE_KEY?.trim() && !warnedNoVapid) {
    console.warn('[medicine-reminders] VAPID keys are not configured — dose reminders will NOT be delivered')
    warnedNoVapid = true
  }
  try {
    const result = await dispatchMedicinePush()
    // The same heartbeat carries the household's morning chore summary; a
    // failure there must not fail dose reminders, so it only logs.
    const choresSent = await dispatchChoreReminderPush().catch(error => {
      console.error('[medicine-reminders] chore summary failed', error instanceof Error ? error.message : error)
      return 0
    })
    markReminderRun()
    return res.status(200).json({ ...result, choresSent })
  } catch (error) {
    console.error('[medicine-reminders] dispatch failed', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Reminder dispatch failed' })
  }
}

export default withApiHandler(handler)
