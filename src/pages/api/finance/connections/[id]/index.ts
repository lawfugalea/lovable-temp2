import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { deleteProviderSession, EnableBankingError } from '@/lib/finance/enable-banking'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const connectionId = typeof req.query.id === 'string' ? req.query.id : ''
  const connection = await prisma.bankConnection.findFirst({
    where: { id: connectionId, userId: access.userId },
    select: { id: true, providerSessionId: true },
  })
  if (!connection) return res.status(404).json({ error: 'Bank connection not found' })

  if (connection.providerSessionId) {
    try {
      await deleteProviderSession(connection.providerSessionId)
    } catch (error) {
      const alreadyInactive = error instanceof EnableBankingError
        && [401, 404].includes(error.status)
      if (!alreadyInactive) {
        console.error('Failed to revoke Enable Banking session:', error)
        return res.status(502).json({ error: 'Could not revoke bank access. Nothing was deleted; please try again.' })
      }
    }
  }

  await prisma.bankConnection.delete({ where: { id: connection.id } })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
