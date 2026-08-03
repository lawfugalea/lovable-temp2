import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/links'
import { withBasePath } from '@/lib/base-path'
import { sendBankConsentEmail } from '@/lib/mailer'
import { sendUserEventPush } from '@/lib/push'
import { bankDisplayName } from './bank-name'
import { dispatchBudgetAlerts } from './budget-alerts'
import {
  isRateLimitError,
  isReauthorizationError,
  publicSyncError,
  syncBankConnection,
} from './sync'

/**
 * Unattended background sync and consent lifecycle for bank connections.
 *
 * Driven by the finance-sync worker container on an hourly poll; this module
 * decides what is actually due so the poll frequency does not matter:
 *
 * - Each ACTIVE connection is synced at most every MIN_SYNC_GAP_HOURS, keeping
 *   the worker at roughly two syncs a day. PSD2 allows four unattended data
 *   accesses per day, so this leaves headroom for the user's manual refreshes.
 * - A "consent expires soon" email goes out once per consent when the expiry
 *   date comes within CONSENT_WARNING_DAYS.
 * - A "please reconnect" email goes out once per episode when a connection
 *   lands in REAUTH_REQUIRED.
 *
 * The once-per-episode stamps (consentReminderSentAt, reauthNotifiedAt) are
 * cleared by the OAuth callback when a reconnect installs a fresh consent.
 */
export const MIN_SYNC_GAP_HOURS = 11
export const CONSENT_WARNING_DAYS = 14

/** Bound the work one poll can do; the next poll picks up the rest. */
const MAX_SYNCS_PER_RUN = 10
const MAX_EMAILS_PER_RUN = 20

const STALE_LOCK_MINUTES = 5

export interface ScheduledSyncReport {
  synced: number
  failed: number
  rateLimited: number
  expiryEmails: number
  reauthEmails: number
}

export async function runScheduledFinanceSync(now = new Date()): Promise<ScheduledSyncReport> {
  const report: ScheduledSyncReport = {
    synced: 0,
    failed: 0,
    rateLimited: 0,
    expiryEmails: 0,
    reauthEmails: 0,
  }

  const dueBefore = new Date(now.getTime() - MIN_SYNC_GAP_HOURS * 3600 * 1000)
  const due = await prisma.bankConnection.findMany({
    where: {
      status: 'ACTIVE',
      providerSessionId: { not: null },
      OR: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { lt: dueBefore } }],
    },
    select: { id: true, userId: true },
    orderBy: { lastSyncAttemptAt: 'asc' },
    take: MAX_SYNCS_PER_RUN,
  })

  for (const { id, userId } of due) {
    // Same lock the manual refresh route takes, so the worker and a user
    // clicking "Refresh" can never sync one connection concurrently.
    const staleLock = new Date(now.getTime() - STALE_LOCK_MINUTES * 60_000)
    const locked = await prisma.bankConnection.updateMany({
      where: {
        id,
        status: 'ACTIVE',
        OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: staleLock } }],
      },
      data: { syncStartedAt: now, lastSyncAttemptAt: now },
    })
    if (locked.count !== 1) continue

    try {
      await syncBankConnection(id)
      report.synced += 1
      // Fresh transactions are the only thing that moves budget progress, so
      // this is the moment to check the owner's monthly limits.
      await dispatchBudgetAlerts(userId, now).catch(error => {
        console.warn('[finance-sync] budget alerts failed:', id, error instanceof Error ? error.message : error)
      })
    } catch (error) {
      const rateLimited = isRateLimitError(error)
      if (rateLimited) report.rateLimited += 1
      else report.failed += 1
      await prisma.bankConnection.update({
        where: { id },
        data: {
          // A daily access cap leaves the consent intact, so keep the
          // connection as it was and only surface the note.
          ...(rateLimited ? {} : { status: isReauthorizationError(error) ? 'REAUTH_REQUIRED' : 'ERROR' }),
          syncError: publicSyncError(error),
        },
      }).catch(() => undefined)
      console.warn('[finance-sync] scheduled sync failed:', id, error instanceof Error ? error.message : error)
    } finally {
      await prisma.bankConnection.updateMany({
        where: { id },
        data: { syncStartedAt: null },
      }).catch(() => undefined)
    }
  }

  const warningHorizon = new Date(now.getTime() + CONSENT_WARNING_DAYS * 24 * 3600 * 1000)
  const needingEmail = await prisma.bankConnection.findMany({
    where: {
      OR: [
        {
          status: 'ACTIVE',
          consentReminderSentAt: null,
          consentExpiresAt: { gt: now, lte: warningHorizon },
        },
        {
          status: 'REAUTH_REQUIRED',
          reauthNotifiedAt: null,
        },
      ],
      // The mailer refuses demo addresses; don't even select them.
      user: { isDemo: false },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      aspspName: true,
      consentExpiresAt: true,
      user: { select: { email: true, name: true } },
    },
    take: MAX_EMAILS_PER_RUN,
  })

  const bankingUrl = appUrl('/banking')
  for (const connection of needingEmail) {
    const bankName = bankDisplayName(connection.aspspName)
    try {
      if (connection.status === 'REAUTH_REQUIRED') {
        const result = await sendBankConsentEmail({
          to: connection.user.email,
          name: connection.user.name,
          bankName,
          bankingUrl,
          kind: 'reauth',
        })
        if (!result.ok) throw new Error(result.error)
        await prisma.bankConnection.update({
          where: { id: connection.id },
          data: { reauthNotifiedAt: now },
        })
        report.reauthEmails += 1
        // Best-effort companion push, gated by the same episode stamp as the
        // email — the stamp was just written, so this fires exactly once too.
        await sendUserEventPush({
          userId: connection.userId,
          payload: {
            body: `${bankName} needs to be reconnected — syncing is paused.`,
            tag: `bank-reauth-${connection.id}`,
            url: withBasePath('/banking'),
          },
        }).catch(() => undefined)
      } else if (connection.consentExpiresAt) {
        const result = await sendBankConsentEmail({
          to: connection.user.email,
          name: connection.user.name,
          bankName,
          bankingUrl,
          kind: 'expiring',
          expiresAt: connection.consentExpiresAt,
        })
        if (!result.ok) throw new Error(result.error)
        await prisma.bankConnection.update({
          where: { id: connection.id },
          data: { consentReminderSentAt: now },
        })
        report.expiryEmails += 1
        await sendUserEventPush({
          userId: connection.userId,
          payload: {
            body: `${bankName} access expires on ${connection.consentExpiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} — renew it from the banking page.`,
            tag: `bank-consent-${connection.id}`,
            url: withBasePath('/banking'),
          },
        }).catch(() => undefined)
      }
    } catch (error) {
      // Stamp only after a successful send, so a mail outage retries on the
      // next poll rather than silently swallowing the reminder.
      console.warn('[finance-sync] consent email failed:', connection.id, error instanceof Error ? error.message : error)
    }
  }

  return report
}
