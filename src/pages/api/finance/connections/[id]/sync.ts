import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isReauthorizationError, publicSyncError, syncBankConnection } from '@/lib/finance/sync'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
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
  const staleLock = new Date(now.getTime() - 5 * 60_000)
  const locked = await prisma.bankConnection.updateMany({
    where: {
      id: connection.id,
      OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: staleLock } }],
    },
    data: { syncStartedAt: now, lastSyncAttemptAt: now },
  })
  if (locked.count !== 1) return res.status(409).json({ error: 'This connection is already syncing' })

  try {
    await syncBankConnection(connection.id)
    return res.status(200).json({ ok: true })
  } catch (error) {
    const message = publicSyncError(error)
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: {
        status: isReauthorizationError(error) ? 'REAUTH_REQUIRED' : 'ERROR',
        syncError: message,
      },
    })
    console.error('BOV sync failed:', error)
    return res.status(isReauthorizationError(error) ? 409 : 502).json({ error: message })
  } finally {
    await prisma.bankConnection.updateMany({
      where: { id: connection.id },
      data: { syncStartedAt: null },
    })
  }
}

export default withApiHandler(handler)
