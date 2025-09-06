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
      const medicines = await prisma.medicine.findMany({
        where: { 
          child: { householdId: householdId as string }
        },
        include: { child: true },
        orderBy: { createdAt: 'desc' }
      })
      
      return res.json(medicines)
    } catch (error) {
      console.error('Failed to fetch medicines:', error)
      return res.status(500).json({ error: 'Failed to fetch medicines' })
    }
  }

  if (req.method === 'POST') {
    const { childId, name, description, dosage, frequency, startDate, endDate, notes } = req.body
    
    if (!childId || !name || !dosage || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      const medicine = await prisma.medicine.create({
        data: {
          childId,
          name,
          description,
          dosage,
          frequency,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          notes
        }
      })
      
      return res.json(medicine)
    } catch (error) {
      console.error('Failed to create medicine:', error)
      return res.status(500).json({ error: 'Failed to create medicine' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
