import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/observability'

/**
 * Durable, cross-process abuse counters.
 *
 * The counters that matter for security — login attempts, password changes,
 * account deletion — used to live in module-level Maps. That made them reset on
 * every deploy and count per process, so running two app containers silently
 * doubled the allowance. Neither is acceptable for the control that stands
 * between an attacker and password guessing.
 *
 * The whole check is a single atomic statement. Read-then-write would let two
 * concurrent attempts both observe a count below the limit and both proceed,
 * which is exactly the race a brute-force tool creates.
 */

interface CounterRow {
  count: number
  resetAt: Date
}

export interface ConsumeResult {
  allowed: boolean
  /** Seconds until the window ends; useful for a Retry-After header. */
  retryAfterSeconds: number
}

/**
 * Count one attempt against `key` and report whether it is within `maxAttempts`.
 *
 * Fails **open** on a database error, deliberately: the alternative is that a
 * database blip locks every user out of signing in. The password check itself is
 * unaffected, so an outage degrades throttling rather than authentication.
 */
export async function consumeDurable(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<ConsumeResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    // One statement: insert the window, or increment it if it is still open and
    // restart it if it has already elapsed.
    const rows = await prisma.$queryRaw<CounterRow[]>`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitCounter"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitCounter"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitCounter"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "RateLimitCounter"."resetAt"
        END
      RETURNING "count", "resetAt"
    `
    const row = rows[0]
    if (!row) return { allowed: true, retryAfterSeconds: 0 }

    return {
      allowed: row.count <= maxAttempts,
      retryAfterSeconds: Math.max(0, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
    }
  } catch (error) {
    captureException(error, { context: 'consumeDurable', key })
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

/** Clear a counter, e.g. after a successful sign-in. */
export async function clearDurable(key: string): Promise<void> {
  try {
    await prisma.rateLimitCounter.deleteMany({ where: { key } })
  } catch (error) {
    // The window expires on its own, so a failure here only means the user
    // keeps a partially-used allowance.
    captureException(error, { context: 'clearDurable', key })
  }
}

/**
 * Delete counters whose window has elapsed.
 *
 * Rows are reused in place while a window is open, so the table only grows with
 * *distinct* keys — one per IP/email seen. This keeps that bounded over time.
 */
export async function sweepExpiredCounters(now = new Date()): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({ where: { resetAt: { lte: now } } })
  return result.count
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10
const INVITE_WINDOW_MS = 60 * 60 * 1000
const INVITE_MAX_ATTEMPTS = 10

/** Namespaced so a login key and an invite key can never collide. */
function loginKey(identifier: string): string {
  return `login:${identifier.trim().toLowerCase() || 'unknown'}`
}

/**
 * CredentialsProvider cannot return a custom API response, so it uses this
 * boolean limiter and returns the same generic login failure when throttled.
 */
export async function consumeLoginAttempt(identifier: string): Promise<boolean> {
  const result = await consumeDurable(loginKey(identifier), LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
  return result.allowed
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  await clearDurable(loginKey(identifier))
}

/** Limit invitation email sends/resends per authenticated owner. */
export async function consumeInviteEmailAttempt(userId: string): Promise<boolean> {
  const result = await consumeDurable(
    `invite-email:${userId || 'unknown'}`,
    INVITE_MAX_ATTEMPTS,
    INVITE_WINDOW_MS,
  )
  return result.allowed
}
