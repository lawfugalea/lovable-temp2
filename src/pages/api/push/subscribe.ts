import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  switch (req.method) {
    case 'POST':
      return handleSubscribe(req, res, user)
    case 'DELETE':
      return handleUnsubscribe(req, res, user)
    case 'GET':
      return handleGetSubscriptions(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleSubscribe(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { subscription, householdId } = req.body

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' })
    }

    if (!householdId) {
      return res.status(400).json({ error: 'householdId is required' })
    }

    // Verify user is member of the household
    const membership = await prisma.membership.findUnique({
      where: {
        userId_householdId: {
          userId: user.id,
          householdId: householdId
        }
      }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this household' })
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: {
        userId_householdId: {
          userId: user.id,
          householdId: householdId
        }
      }
    })

    const subscriptionData = {
      userId: user.id,
      householdId: householdId,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys?.p256dh || '',
      authKey: subscription.keys?.auth || ''
    }

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await prisma.pushSubscription.update({
        where: {
          userId_householdId: {
            userId: user.id,
            householdId: householdId
          }
        },
        data: {
          endpoint: subscriptionData.endpoint,
          p256dhKey: subscriptionData.p256dhKey,
          authKey: subscriptionData.authKey
        }
      })

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ 
        subscription: updatedSubscription,
        message: 'Subscription updated successfully'
      })
    } else {
      // Create new subscription
      const newSubscription = await prisma.pushSubscription.create({
        data: subscriptionData
      })

      res.setHeader('Cache-Control', 'no-store')
      return res.status(201).json({ 
        subscription: newSubscription,
        message: 'Subscription created successfully'
      })
    }
  } catch (error) {
    console.error('Error handling push subscription:', error)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: 'Failed to handle push subscription' })
  }
}

async function handleUnsubscribe(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { householdId } = req.body

    if (!householdId) {
      return res.status(400).json({ error: 'householdId is required' })
    }

    // Delete the subscription
    const deletedSubscription = await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        householdId: householdId
      }
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ 
      message: 'Subscription deleted successfully',
      deletedCount: deletedSubscription.count
    })
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: 'Failed to unsubscribe' })
  }
}

async function handleGetSubscriptions(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: user.id
      },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ subscriptions })
  } catch (error) {
    console.error('Error fetching push subscriptions:', error)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
}
