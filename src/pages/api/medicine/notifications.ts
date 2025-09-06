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
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

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

      const dueMedicines = medicines.filter(medicine => {
        const lastDose = medicine.doses[0]
        
        if (!lastDose) {
          // No doses taken yet, check if it's time to start
          return now >= new Date(medicine.startDate)
        }

        // Calculate next dose time based on frequency
        const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
        
        // Check if medicine is due now, in 5 minutes, or in 15 minutes
        const timeUntilNext = nextDoseTime.getTime() - now.getTime()
        return now >= nextDoseTime || 
               (timeUntilNext <= 5 * 60 * 1000 && timeUntilNext > 0) ||
               (timeUntilNext <= 15 * 60 * 1000 && timeUntilNext > 5 * 60 * 1000)
      })

      // Group by reminder type
      const reminders = {
        dueNow: [] as any[],
        dueIn5Minutes: [] as any[],
        dueIn15Minutes: [] as any[]
      }

      dueMedicines.forEach(medicine => {
        const lastDose = medicine.doses[0]
        const nextDoseTime = lastDose 
          ? calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
          : new Date(medicine.startDate)

        const timeUntilNext = nextDoseTime.getTime() - now.getTime()

        if (now >= nextDoseTime) {
          reminders.dueNow.push(medicine)
        } else if (timeUntilNext <= 5 * 60 * 1000 && timeUntilNext > 0) {
          reminders.dueIn5Minutes.push(medicine)
        } else if (timeUntilNext <= 15 * 60 * 1000 && timeUntilNext > 5 * 60 * 1000) {
          reminders.dueIn15Minutes.push(medicine)
        }
      })

      return res.json(reminders)
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
      if (frequency.includes('hour')) {
        const hours = parseInt(frequency.match(/\d+/)?.[0] || '6')
        return new Date(lastDoseTime.getTime() + hours * 60 * 60 * 1000)
      } else if (frequency.includes('daily')) {
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
      }
      return new Date(lastDoseTime.getTime() + 6 * 60 * 60 * 1000) // Default to 6 hours
  }
}
