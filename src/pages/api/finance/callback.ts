import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/links'
import { completeAuthorization, deleteProviderSession, getProviderSession } from '@/lib/finance/enable-banking'
import { normalizeBankAccount, type NormalizedBankAccount } from '@/lib/finance/normalization'
import { isReauthorizationError, publicSyncError, syncBankConnection } from '@/lib/finance/sync'

function redirect(res: NextApiResponse, params: Record<string, string>) {
  const target = new URL(appUrl('/banking'))
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  res.setHeader('Cache-Control', 'no-store')
  return res.redirect(303, target.toString())
}

function sessionAccounts(session: Record<string, unknown>): Record<string, unknown>[] {
  const accounts = Array.isArray(session.accounts) ? session.accounts : []
  const accountData = Array.isArray(session.accounts_data) ? session.accounts_data : []
  const resources = [...accounts, ...accountData].filter(
    item => item && typeof item === 'object' && !Array.isArray(item),
  ) as Record<string, unknown>[]
  const unique = new Map<string, Record<string, unknown>>()
  for (const resource of resources) {
    const uid = typeof resource.uid === 'string' ? resource.uid : null
    if (uid) unique.set(uid, { ...(unique.get(uid) || {}), ...resource })
  }
  return [...unique.values()]
}

function consentExpiry(session: Record<string, unknown>): Date | null {
  const access = session.access && typeof session.access === 'object'
    ? session.access as Record<string, unknown>
    : {}
  const parsed = typeof access.valid_until === 'string' ? new Date(access.valid_until) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const providerError = typeof req.query.error === 'string' ? req.query.error : ''
  if (!state) return redirect(res, { bankError: 'invalid_callback' })

  const session = (await getServerSession(req, res, authOptions as any)) as
    | { user?: { id?: string } }
    | null
  const userId = session?.user?.id
  if (!userId) return redirect(res, { bankError: 'session_expired' })

  const attempt = await prisma.bankAuthorizationAttempt.findUnique({
    where: { state },
    include: { connection: { select: { id: true, userId: true, providerSessionId: true } } },
  })
  if (!attempt || attempt.userId !== userId || attempt.expiresAt <= new Date() || attempt.consumedAt) {
    return redirect(res, { bankError: 'invalid_or_expired_state' })
  }

  const consumed = await prisma.bankAuthorizationAttempt.updateMany({
    where: { id: attempt.id, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  if (consumed.count !== 1) return redirect(res, { bankError: 'callback_already_used' })
  if (providerError || !code) return redirect(res, { bankError: 'authorization_cancelled' })

  let provisionalSessionId: string | null = null
  let persistedConnectionId: string | null = null
  try {
    let providerSession = await completeAuthorization(code)
    const providerSessionId = typeof providerSession.session_id === 'string'
      ? providerSession.session_id
      : ''
    if (!providerSessionId) throw new Error('Enable Banking did not return a session ID')
    provisionalSessionId = providerSessionId

    let resources = sessionAccounts(providerSession)
    if (!resources.length || resources.some(resource => typeof resource.identification_hash !== 'string')) {
      providerSession = { ...providerSession, ...await getProviderSession(providerSessionId) }
      resources = sessionAccounts(providerSession)
    }

    const normalized = resources
      .map(resource => normalizeBankAccount(resource))
      .filter((account): account is NormalizedBankAccount => Boolean(account))
    if (!normalized.length) throw new Error('BOV did not return any accessible accounts')

    const oldSessionId = attempt.connection?.providerSessionId || null
    const connection = await prisma.$transaction(async tx => {
      const savedConnection = attempt.connection
        ? await tx.bankConnection.update({
            where: { id: attempt.connection.id },
            data: {
              providerSessionId,
              status: 'ACTIVE',
              consentExpiresAt: consentExpiry(providerSession),
              syncError: null,
            },
          })
        : await tx.bankConnection.create({
            data: {
              userId,
              aspspName: attempt.aspspName,
              aspspCountry: attempt.aspspCountry,
              providerSessionId,
              status: 'ACTIVE',
              consentExpiresAt: consentExpiry(providerSession),
            },
          })

      const hashes: string[] = []
      for (const account of normalized) {
        hashes.push(account.identificationHash)
        await tx.bankAccount.upsert({
          where: {
            connectionId_identificationHash: {
              connectionId: savedConnection.id,
              identificationHash: account.identificationHash,
            },
          },
          create: { connectionId: savedConnection.id, ...account },
          update: {
            providerAccountId: account.providerAccountId,
            displayName: account.displayName,
            maskedIdentifier: account.maskedIdentifier,
            currency: account.currency,
            cashAccountType: account.cashAccountType,
          },
        })
      }
      await tx.bankAccount.deleteMany({
        where: { connectionId: savedConnection.id, identificationHash: { notIn: hashes } },
      })
      return savedConnection
    })
    persistedConnectionId = connection.id

    if (oldSessionId && oldSessionId !== providerSessionId) {
      await deleteProviderSession(oldSessionId).catch(error => {
        console.warn('Unable to close replaced Enable Banking session:', error)
      })
    }

    try {
      await syncBankConnection(connection.id)
      return redirect(res, { bankConnected: '1' })
    } catch (error) {
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: {
          status: isReauthorizationError(error) ? 'REAUTH_REQUIRED' : 'ERROR',
          syncError: publicSyncError(error),
        },
      })
      console.error('Initial BOV sync failed:', error)
      return redirect(res, { bankConnected: '1', syncWarning: '1' })
    }
  } catch (error) {
    if (provisionalSessionId && !persistedConnectionId) {
      await deleteProviderSession(provisionalSessionId).catch(() => undefined)
    }
    console.error('Failed to complete BOV authorization:', error)
    return redirect(res, { bankError: 'authorization_failed' })
  }
}

export default withApiHandler(handler)
