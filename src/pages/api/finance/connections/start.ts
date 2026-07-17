import { randomBytes } from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/links'
import { requireFinanceAccess } from '@/lib/finance/access'
import { getFinanceAspsp, isFinanceProviderConfigured } from '@/lib/finance/config'
import { startBovAuthorization } from '@/lib/finance/enable-banking'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true })
  if (!access) return
  if (!isFinanceProviderConfigured()) {
    return res.status(503).json({ error: 'Enable Banking credentials are not configured' })
  }

  const requestedConnectionId = typeof req.body?.connectionId === 'string'
    ? req.body.connectionId
    : null
  let connectionId: string | null = null
  if (requestedConnectionId) {
    const connection = await prisma.bankConnection.findFirst({
      where: { id: requestedConnectionId, userId: access.userId },
      select: { id: true },
    })
    if (!connection) return res.status(404).json({ error: 'Bank connection not found' })
    connectionId = connection.id
  } else {
    const existing = await prisma.bankConnection.findFirst({
      where: { userId: access.userId },
      select: { id: true },
    })
    if (existing) {
      return res.status(409).json({ error: 'Reconnect the existing Bank of Valletta connection instead' })
    }
  }

  await prisma.bankAuthorizationAttempt.deleteMany({
    where: { userId: access.userId, OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }] },
  })

  const state = randomBytes(32).toString('base64url')
  const aspsp = getFinanceAspsp()
  const attempt = await prisma.bankAuthorizationAttempt.create({
    data: {
      state,
      userId: access.userId,
      householdId: access.householdId,
      connectionId,
      aspspName: aspsp.name,
      aspspCountry: aspsp.country,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })

  try {
    const authorization = await startBovAuthorization({
      state,
      redirectUrl: appUrl('/api/finance/callback'),
      aspsp,
    })
    if (!authorization.url || !authorization.url.startsWith('https://')) {
      throw new Error('Provider returned an invalid authorization URL')
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ authorizationUrl: authorization.url })
  } catch (error) {
    await prisma.bankAuthorizationAttempt.delete({ where: { id: attempt.id } }).catch(() => undefined)
    console.error('Failed to start BOV authorization:', error)
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to start bank connection' })
  }
}
