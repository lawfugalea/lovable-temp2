import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const { householdId } = req.query
    
    if (!householdId) {
      return res.status(400).json({ error: 'Household ID required' })
    }

    try {
      const reminders = await prisma.medicineReminder.findMany({
        where: { 
          child: { householdId: householdId as string },
          isActive: true
        },
        include: { 
          child: true,
          medicine: true 
        },
        orderBy: { scheduledAt: 'asc' }
      })
      
      return res.json(reminders)
    } catch (error) {
      console.error('Failed to fetch reminders:', error)
      return res.status(500).json({ error: 'Failed to fetch reminders' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
