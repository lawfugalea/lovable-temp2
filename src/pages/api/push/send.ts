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
      return handleSendPushNotification(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleSendPushNotification(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { title, body, icon, url, userIds } = req.body

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' })
    }

    // Get push subscriptions for the specified users (or current user if no userIds specified)
    const targetUserIds = userIds && userIds.length > 0 ? userIds : [user.id]
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: {
          in: targetUserIds
        }
      }
    })

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No push subscriptions found for the specified users' })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icon-192x192.png',
      url: url || '/notes-v2',
      badge: '/icon-192x192.png',
      tag: 'houseflow-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open Note',
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
        } catch (error: any) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error)
          
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
      message: 'Push notifications sent',
      total: subscriptions.length,
      successful,
      failed,
      results: results.map(result => result.status === 'fulfilled' ? result.value : { success: false, error: result.reason })
    })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return res.status(500).json({ error: 'Failed to send push notification' })
  }
}
