import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    const { subscription, householdId } = req.body
    
    if (!subscription || !householdId) {
      return res.status(400).json({ error: 'Subscription and household ID required' })
    }

    try {
      // Store push subscription in database
      const pushSubscription = await prisma.pushSubscription.upsert({
        where: {
          userId_householdId: {
            userId: session.user.id,
            householdId: householdId
          }
        },
        update: {
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          householdId: householdId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth
        }
      })

      return res.json({ success: true, subscription: pushSubscription })
    } catch (error) {
      console.error('Failed to store push subscription:', error)
      return res.status(500).json({ error: 'Failed to store push subscription' })
    }
  }

  if (req.method === 'DELETE') {
    const { householdId } = req.query
    
    if (!householdId) {
      return res.status(400).json({ error: 'Household ID required' })
    }

    try {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId: session.user.id,
          householdId: householdId as string
        }
      })

      return res.json({ success: true })
    } catch (error) {
      console.error('Failed to delete push subscription:', error)
      return res.status(500).json({ error: 'Failed to delete push subscription' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
