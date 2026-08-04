import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/links'
import {
  completeAuthorization,
  deleteProviderSession,
  getProviderSession,
  sessionAccounts,
  sessionConsentExpiry,
} from '@/lib/finance/enable-banking'
import { normalizeBankAccount, type NormalizedBankAccount } from '@/lib/finance/normalization'
import { runLockedSync } from '@/lib/finance/sync'

function redirect(res: NextApiResponse, params: Record<string, string>) {
  const target = new URL(appUrl('/banking'))
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  res.setHeader('Cache-Control', 'no-store')
  return res.redirect(303, target.toString())
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
  // Previously synced accounts the bank did not return this time, kept rather
  // than deleted. Surfaced so a whitelist gap cannot pass as a clean reconnect.
  let retainedAccounts = 0
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
              consentExpiresAt: sessionConsentExpiry(providerSession),
              syncError: null,
              // Fresh consent, fresh lifecycle: the expiry reminder and the
              // reauth nudge may each fire once for this new episode.
              consentReminderSentAt: null,
              reauthNotifiedAt: null,
            },
          })
        : await tx.bankConnection.create({
            data: {
              userId,
              aspspName: attempt.aspspName,
              aspspCountry: attempt.aspspCountry,
              providerSessionId,
              status: 'ACTIVE',
              consentExpiresAt: sessionConsentExpiry(providerSession),
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
      // Accounts missing from this session are NOT automatically closed accounts.
      // Enable Banking's restricted mode strips every account that is not linked
      // to the application, so a whitelist gap looks exactly like a closed
      // account here — and deleting cascades the balances and transactions away.
      // Only drop rows that carry no history, and keep anything we would lose.
      const stale = await tx.bankAccount.findMany({
        where: { connectionId: savedConnection.id, identificationHash: { notIn: hashes } },
        select: {
          id: true,
          maskedIdentifier: true,
          _count: { select: { transactions: true, balances: true } },
        },
      })
      const disposable = stale.filter(
        account => account._count.transactions === 0 && account._count.balances === 0,
      )
      if (disposable.length) {
        await tx.bankAccount.deleteMany({ where: { id: { in: disposable.map(a => a.id) } } })
      }
      retainedAccounts = stale.length - disposable.length
      if (retainedAccounts) {
        console.warn(
          `BOV session for connection ${savedConnection.id} returned ${normalized.length} account(s) `
          + `but ${retainedAccounts} previously synced account(s) were absent and have been kept: `
          + stale
            .filter(account => account._count.transactions || account._count.balances)
            .map(account => account.maskedIdentifier || account.id)
            .join(', '),
        )
      }
      return savedConnection
    })
    persistedConnectionId = connection.id

    if (oldSessionId && oldSessionId !== providerSessionId) {
      await deleteProviderSession(oldSessionId).catch(error => {
        console.warn('Unable to close replaced Enable Banking session:', error)
      })
    }

    const partial: Record<string, string> = retainedAccounts
      ? { partialAccounts: String(retainedAccounts) }
      : {}

    // The first sync asks for a year of history across every account, which runs
    // for minutes — far longer than the browser sitting on the bank's redirect,
    // or the reverse proxy in front of it, will wait. Awaiting it here made a
    // successful connection look like a hung authorization. Start it detached
    // and hand the reader back to the app straight away; `runLockedSync` records
    // the outcome. If the process dies mid-import the attempt is already stamped,
    // so the worker will not retry for MIN_SYNC_GAP_HOURS — "Refresh" recovers it
    // in one click, and the stale-lock window keeps the connection unblocked.
    void runLockedSync(connection.id)
      .then(result => {
        if (result.ok || result.reason === 'busy') return
        console.error(`Initial BOV sync failed for connection ${connection.id}: ${result.message}`)
      })
      .catch(error => {
        console.error('Initial BOV sync crashed:', error)
      })

    return redirect(res, { bankConnected: '1', syncPending: '1', ...partial })
  } catch (error) {
    if (provisionalSessionId && !persistedConnectionId) {
      await deleteProviderSession(provisionalSessionId).catch(() => undefined)
    }
    console.error('Failed to complete BOV authorization:', error)
    return redirect(res, { bankError: 'authorization_failed' })
  }
}

export default withApiHandler(handler)
