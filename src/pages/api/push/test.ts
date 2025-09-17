import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma';
import webpush from 'web-push'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@houseflow.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

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
      return handleTestPushNotification(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleTestPushNotification(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: user.id
      }
    })

    if (subscriptions.length === 0) {
      return res.status(404).json({ 
        error: 'No push subscriptions found. Please enable notifications first.' 
      })
    }

    const payload = JSON.stringify({
      title: 'HouseFlow Test Notification',
      body: 'This is a test notification from HouseFlow Notes!',
      icon: '/icon-192x192.png',
      url: '/notes-v2',
      badge: '/icon-192x192.png',
      tag: 'houseflow-test',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open Notes',
          icon: '/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-192x192.png'
        }
      ]
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dhKey,
                auth: subscription.authKey
              }
            },
            payload
          )
          return { subscriptionId: subscription.id, success: true }
        } catch (error) {
          console.error(`Failed to send test push notification to subscription ${subscription.id}:`, error)
          
          // If the subscription is invalid, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            })
          }
          
          return { subscriptionId: subscription.id, success: false, error: error.message }
        }
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length
    const failed = results.length - successful

    return res.status(200).json({
      message: 'Test push notification sent',
      total: subscriptions.length,
      successful,
      failed,
      results: results.map(result => result.status === 'fulfilled' ? result.value : { success: false, error: result.reason })
    })
  } catch (error) {
    console.error('Error sending test push notification:', error)
    return res.status(500).json({ error: 'Failed to send test push notification' })
  }
}
