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
      
      return res.json(doses)
    } catch (error) {
      console.error('Failed to fetch doses:', error)
      return res.status(500).json({ error: 'Failed to fetch doses' })
    }
  }

  if (req.method === 'POST') {
    const { childId, medicineId, takenAt, dosage, notes, takenBy } = req.body
    
    if (!childId || !medicineId || !takenAt || !dosage) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      const dose = await prisma.medicineDose.create({
        data: {
          childId,
          medicineId,
          takenAt: new Date(takenAt),
          dosage,
          notes,
          takenBy
        }
      })
      
      return res.json(dose)
    } catch (error) {
      console.error('Failed to create dose:', error)
      return res.status(500).json({ error: 'Failed to create dose' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
