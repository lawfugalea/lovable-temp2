import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { dispatchBudgetAlerts } from '@/lib/finance/budget-alerts'
import { runLockedSync } from '@/lib/finance/sync'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const connectionId = typeof req.query.id === 'string' ? req.query.id : ''
  const connection = await prisma.bankConnection.findFirst({
    where: { id: connectionId, userId: access.userId },
  })
  if (!connection) return res.status(404).json({ error: 'Bank connection not found' })

  const now = new Date()
  if (connection.lastSyncAttemptAt && now.getTime() - connection.lastSyncAttemptAt.getTime() < 60_000) {
    return res.status(429).json({ error: 'Please wait a minute before refreshing again' })
  }
  // No requireActive: someone pressing Refresh on a broken connection should get
  // the real error back rather than a "already syncing" that explains nothing.
  const result = await runLockedSync(connection.id)
  if (result.ok) {
    // Budget limits can only move when new transactions land; evaluate now,
    // without holding up the response the refresh button is waiting for.
    void dispatchBudgetAlerts(connection.userId).catch(error => {
      console.warn('Budget alerts failed after manual sync:', error instanceof Error ? error.message : error)
    })
    return res.status(200).json({ ok: true })
  }
  if (result.reason === 'busy') {
    return res.status(409).json({ error: 'This connection is already syncing' })
  }
  if (result.rateLimited) {
    console.warn('BOV sync hit the bank daily access limit:', connection.id)
    return res.status(429).json({ error: result.message })
  }
  console.error('BOV sync failed:', connection.id, result.message)
  return res.status(result.reauth ? 409 : 502).json({ error: result.message })
}

export default withApiHandler(handler)
