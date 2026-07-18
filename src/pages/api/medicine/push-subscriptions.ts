import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'
import { isMedicinePushConfigured, medicinePushPublicKey } from '@/lib/medicine-push'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { respondUpgradeRequired } from '@/lib/entitlements-core'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || req.body?.householdId || '')
  const context = await requireMembershipIn(req, res, householdId)
  if (!context) return

  if (req.method === 'GET') {
    const [activeDevices, entitlements] = await Promise.all([
      prisma.pushSubscription.count({ where: { userId: context.userId, householdId, enabled: true } }),
      getHouseholdEntitlements(householdId),
    ])
    return res.status(200).json({
      configured: isMedicinePushConfigured(),
      publicKey: medicinePushPublicKey(),
      activeDevices,
      entitled: entitlements.canUsePushReminders,
    })
  }

  if (req.method === 'POST') {
    if (!isMedicinePushConfigured()) return res.status(503).json({ error: 'Web Push is not configured' })
    const entitlements = await getHouseholdEntitlements(householdId)
    if (!entitlements.canUsePushReminders) return respondUpgradeRequired(res, 'pushReminders')
    const subscription = req.body?.subscription
    const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint.trim() : ''
    const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh.trim() : ''
    const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth.trim() : ''
    if (!endpoint.startsWith('https://') || endpoint.length > 2048 || !p256dh || p256dh.length > 512 || !auth || auth.length > 512) {
      return res.status(400).json({ error: 'Invalid push subscription' })
    }
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: context.userId, householdId, endpoint, p256dh, auth,
        userAgent: req.headers['user-agent']?.slice(0, 500) || null,
      },
      update: {
        userId: context.userId, householdId, p256dh, auth, enabled: true, lastSeenAt: new Date(),
        userAgent: req.headers['user-agent']?.slice(0, 500) || null,
      },
      select: { id: true, enabled: true },
    })
    return res.status(201).json(saved)
  }

  if (req.method === 'DELETE') {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : ''
    if (!endpoint) return res.status(400).json({ error: 'Subscription endpoint is required' })
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: context.userId, householdId } })
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
