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
      const now = new Date()

      // Get all active medicines for the household
      const medicines = await prisma.medicine.findMany({
        where: { 
          child: { householdId: householdId as string },
          isActive: true
        },
        include: { 
          child: true,
          doses: {
            orderBy: { takenAt: 'desc' },
            take: 1
          }
        }
      })

      // Only return medicines due in 15 minutes (with 5-minute window)
      const dueIn15Minutes = medicines.filter(medicine => {
        const lastDose = medicine.doses[0]
        
        if (!lastDose) {
          // No doses taken yet, check if it's time to start in 15 minutes
          const startTime = new Date(medicine.startDate)
          const timeUntilStart = startTime.getTime() - now.getTime()
          return timeUntilStart <= 15 * 60 * 1000 && timeUntilStart > 10 * 60 * 1000
        }

        // Calculate next dose time based on frequency
        const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
        const timeUntilNext = nextDoseTime.getTime() - now.getTime()
        
        // Only show notification 15 minutes before due time (with 5-minute window)
        return timeUntilNext <= 15 * 60 * 1000 && timeUntilNext > 10 * 60 * 1000
      })

      return res.json({ dueIn15Minutes })
    } catch (error) {
      console.error('Failed to fetch medicine notifications:', error)
      return res.status(500).json({ error: 'Failed to fetch medicine notifications' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

function calculateNextDoseTime(frequency: string, lastDoseTime: Date): Date {
  switch (frequency) {
    case 'every 2 hours':
      return new Date(lastDoseTime.getTime() + 2 * 60 * 60 * 1000)
    case 'every 4 hours':
      return new Date(lastDoseTime.getTime() + 4 * 60 * 60 * 1000)
    case 'every 6 hours':
      return new Date(lastDoseTime.getTime() + 6 * 60 * 60 * 1000)
    case 'every 8 hours':
      return new Date(lastDoseTime.getTime() + 8 * 60 * 60 * 1000)
    case 'every 12 hours':
      return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
    case 'twice daily':
      return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
    case 'once daily':
      return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
    case 'as needed':
      return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
    default:
      // Fallback for any custom frequencies
      // First check for daily patterns (most important)
      if (frequency.toLowerCase().includes('once') && frequency.toLowerCase().includes('daily')) {
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
      } else if (frequency.toLowerCase().includes('daily')) {
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
      } else if (frequency.toLowerCase().includes('hour')) {
        const hours = parseInt(frequency.match(/\d+/)?.[0] || '24')
        return new Date(lastDoseTime.getTime() + hours * 60 * 60 * 1000)
      }
      // Default to 24 hours for unknown frequencies to be safe
      return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
  }
}
