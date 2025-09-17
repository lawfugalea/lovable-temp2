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
    const { householdId, startDate } = req.query
    
    if (!householdId) {
      return res.status(400).json({ error: 'Household ID required' })
    }

    try {
      const whereClause: any = { 
        child: { householdId: householdId as string }
      }

      // Add date filter if startDate is provided
      if (startDate) {
        whereClause.takenAt = {
          gte: new Date(startDate as string)
        }
      }

      const doses = await prisma.medicineDose.findMany({
        where: whereClause,
        include: { 
          child: true,
          medicine: true 
        },
        orderBy: { takenAt: 'desc' }
      })
      
      res.setHeader('Cache-Control', 'no-store');
      return res.json(doses)
    } catch (error) {
      console.error('Failed to fetch doses:', error)
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).json({ error: 'Failed to fetch doses' })
    }
  }

  if (req.method === 'POST') {
    const { childId, medicineId, takenAt, dosage, notes, takenBy } = req.body
    
    if (!childId || !medicineId || !takenAt || !dosage) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      // Handle datetime-local input which comes as "2024-01-15T14:30"
      // This is local time, so we need to treat it as such
      let takenAtDate
      if (takenAt.includes('T') && !takenAt.includes('Z') && !takenAt.includes('+')) {
        // This is a datetime-local format, treat as local time
        // Parse the local time and create a Date object that represents the local time
        const [datePart, timePart] = takenAt.split('T')
        const [year, month, day] = datePart.split('-')
        const [hour, minute] = timePart.split(':')
        // Create date in local timezone - this will be stored as UTC in the database
        takenAtDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
      } else {
        takenAtDate = new Date(takenAt)
      }

      const dose = await prisma.medicineDose.create({
        data: {
          childId,
          medicineId,
          takenAt: takenAtDate,
          dosage,
          notes,
          takenBy
        }
      })
      
      res.setHeader('Cache-Control', 'no-store');
      return res.json(dose)
    } catch (error) {
      console.error('Failed to create dose:', error)
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).json({ error: 'Failed to create dose' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
