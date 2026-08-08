import { prisma } from '@/lib/prisma'

/**
 * Very short-lived cache of the row the JWT callback checks on every request.
 *
 * NextAuth's `jwt` callback runs for each `getServerSession`/`getToken`, and it
 * has to re-read the user to enforce password-version revocation. A single page
 * load fires eight to ten API requests, so that became eight to ten identical
 * `user.findUnique` queries within the same second.
 *
 * The TTL is deliberately tiny: long enough to collapse one page's burst, short
 * enough that nothing else can drift. Crucially it does *not* weaken session
 * revocation — `invalidateSessionUser` is called wherever a password changes,
 * so a revoked session is still rejected on its very next request rather than
 * up to a TTL later.
 *
 * Process-local, like the rate limiter. With more than one app container each
 * would keep its own copy, which is harmless: the entries are a read-through
 * cache of committed rows, not shared state.
 */

const TTL_MS = 10_000
const MAX_ENTRIES = 5_000

export interface SessionUser {
  activeHouseholdId: string | null
  name: string | null
  email: string
  password: string
  isDemo: boolean
}

const cache = new Map<string, { user: SessionUser | null; expiresAt: number }>()

/** Drop this user's cached row. Call after anything that must end their sessions. */
export function invalidateSessionUser(userId: string): void {
  cache.delete(userId)
}

export async function getSessionUser(userId: string): Promise<SessionUser | null> {
  const now = Date.now()
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > now) return cached.user

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true, name: true, email: true, password: true, isDemo: true },
  })

  // Bound memory the same way the rate limiter does: sweep expired entries
  // first, then evict the oldest if the map is still at its ceiling.
  if (cache.size >= MAX_ENTRIES) {
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) cache.delete(key)
    }
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value as string | undefined
      if (oldest) cache.delete(oldest)
    }
  }

  cache.set(userId, { user, expiresAt: now + TTL_MS })
  return user
}
