import webpush from 'web-push'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getHouseholdEntitlements } from '@/lib/entitlements'

/**
 * Shared Web Push plumbing.
 *
 * The medicine reminder pipeline keeps its own durable delivery ledger
 * (PushDelivery) because a missed dose reminder must retry. Event pushes —
 * chores due today, a bank connection needing attention, a shopping list
 * refilled — are best-effort: they are sent at most once per dedupe key and
 * never retried, because "chores are due" arriving tomorrow is noise.
 *
 * Push remains a Family-plan feature; every send path checks the household's
 * `canUsePushReminders` entitlement before touching a subscription.
 */

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim()
    && process.env.VAPID_PRIVATE_KEY?.trim()
    && process.env.VAPID_SUBJECT?.trim()
  )
}

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null
}

export function configureWebPush() {
  const publicKey = pushPublicKey()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject) throw new Error('Web Push is not configured')
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export interface PushPayload {
  title?: string
  body: string
  /** Notification tag: replaces an earlier notification with the same tag. */
  tag: string
  /** In-app path the notification opens, already base-path relative (e.g. '/chores'). */
  url: string
}

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string }

/**
 * Claim `dedupeKey` in the once-only ledger. True exactly once per key across
 * every process and worker run; the loser of a race sees the unique violation.
 */
export async function claimPushEvent(dedupeKey: string): Promise<boolean> {
  try {
    await prisma.pushEvent.create({ data: { dedupeKey } })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false
    throw error
  }
}

async function deliverToSubscriptions(subscriptions: SubscriptionRow[], payload: PushPayload): Promise<number> {
  configureWebPush()
  let sent = 0
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({ title: payload.title ?? 'Clankeep', body: payload.body, tag: payload.tag, url: payload.url }),
      )
      sent += 1
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0
      if (statusCode === 404 || statusCode === 410) {
        // The browser deleted this subscription; stop pushing at a dead door.
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { enabled: false },
        }).catch(() => undefined)
      } else {
        console.warn('[push] delivery failed:', error instanceof Error ? error.message : error)
      }
    }
  }
  return sent
}

/**
 * Push an event notification to every enabled subscription in a household
 * (optionally narrowed to one member). Returns the number delivered; 0 when
 * push is unconfigured, the household lacks the entitlement, the dedupe key
 * was already claimed, or nobody is subscribed.
 */
export async function sendHouseholdEventPush(options: {
  householdId: string
  payload: PushPayload
  /** Once-only key, e.g. `chores:<householdId>:<date>`. Omit for send-always. */
  dedupeKey?: string
  onlyUserId?: string
}): Promise<number> {
  if (!isPushConfigured()) return 0
  const entitlements = await getHouseholdEntitlements(options.householdId)
  if (!entitlements.canUsePushReminders) return 0

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      householdId: options.householdId,
      enabled: true,
      ...(options.onlyUserId ? { userId: options.onlyUserId } : {}),
      user: { memberships: { some: { householdId: options.householdId } } },
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })
  if (!subscriptions.length) return 0

  // Claimed only after subscriptions are found: an event on a day nobody is
  // subscribed yet should still be sendable once somebody subscribes.
  if (options.dedupeKey && !(await claimPushEvent(options.dedupeKey))) return 0

  return deliverToSubscriptions(subscriptions, options.payload)
}

/**
 * Push an event notification to one user's enabled subscriptions across all
 * their households (entitlement checked per subscription's household). Used
 * for person-scoped events like a bank connection needing attention.
 */
export async function sendUserEventPush(options: {
  userId: string
  payload: PushPayload
  dedupeKey?: string
}): Promise<number> {
  if (!isPushConfigured()) return 0

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: options.userId, enabled: true },
    select: { id: true, endpoint: true, p256dh: true, auth: true, householdId: true },
  })
  if (!subscriptions.length) return 0

  const entitled: SubscriptionRow[] = []
  const cache = new Map<string, boolean>()
  for (const subscription of subscriptions) {
    let ok = cache.get(subscription.householdId)
    if (ok === undefined) {
      ok = (await getHouseholdEntitlements(subscription.householdId)).canUsePushReminders
      cache.set(subscription.householdId, ok)
    }
    if (ok) entitled.push(subscription)
  }
  if (!entitled.length) return 0

  if (options.dedupeKey && !(await claimPushEvent(options.dedupeKey))) return 0

  return deliverToSubscriptions(entitled, options.payload)
}

/** How long claimed dedupe keys are kept before demo-cleanup sweeps them. */
export const PUSH_EVENT_RETENTION_DAYS = 30

export async function sweepExpiredPushEvents(now = new Date()): Promise<number> {
  const { count } = await prisma.pushEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - PUSH_EVENT_RETENTION_DAYS * 24 * 3600 * 1000) } },
  })
  return count
}
