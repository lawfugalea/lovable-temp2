import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const householdId = req.query.householdId as string

  if (!householdId) {
    return res.status(400).json({ error: 'Household ID required' })
  }

  if (req.method === 'GET') {
    try {
      const medicines = await prisma.medicine.findMany({
        where: { 
          child: {
            householdId
          }
        },
        include: {
          child: true
        },
        orderBy: { createdAt: 'desc' }
      })
      return res.json(medicines)
    } catch (error) {
      console.error('Failed to fetch medicines:', error)
      return res.status(500).json({ error: 'Failed to fetch medicines' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, dosage, frequency, unit, instructions, childId } = req.body

      if (!name || !dosage || !frequency || !childId) {
        return res.status(400).json({ error: 'Missing required fields: name, dosage, frequency, childId' })
      }

      // Verify the child belongs to the household
      const child = await prisma.child.findFirst({
        where: {
          id: childId,
          householdId
        }
      })

      if (!child) {
        return res.status(400).json({ error: 'Child not found or does not belong to household' })
      }

      const medicine = await prisma.medicine.create({
        data: {
          name,
          dosage: dosage.includes(unit || 'mg') ? dosage : `${dosage} ${unit || 'mg'}`,
          frequency: frequency.includes('every') ? frequency : `every ${frequency} hours`,
          notes: instructions || '',
          childId,
          startDate: new Date()
        },
        include: {
          child: true
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