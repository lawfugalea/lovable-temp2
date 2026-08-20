import type { NextApiResponse } from 'next'
import { prisma } from './prisma'

export const DEMO_EMAIL_DOMAIN = 'demo.clankeep.invalid'
export const DEMO_TTL_HOURS = 24

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE_ENABLED === 'true'
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`)
}

/**
 * Demo sessions are for exploring, not for outward-facing or destructive
 * account actions. Responds 403 and returns true when the caller is a demo
 * user and the route should stop.
 */
export async function rejectDemoUser(
  res: NextApiResponse,
  userId: string,
  action = 'This action',
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isDemo: true } })
  if (!user?.isDemo) return false
  res.status(403).json({ error: `${action} is not available in the demo — create a free account to use it` })
  return true
}

/** Delete expired demo households and users. Returns how many users were removed. */
export async function purgeExpiredDemoUsers(limit = 20): Promise<number> {
  const expired = await prisma.user.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: limit,
  })
  if (!expired.length) return 0
  const ids = expired.map(user => user.id)
  // Owned households cascade their content; delete them first so the user
  // rows (and phantom members) can go cleanly.
  await prisma.household.deleteMany({ where: { ownerId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids }, isDemo: true } })
  return ids.length
}

