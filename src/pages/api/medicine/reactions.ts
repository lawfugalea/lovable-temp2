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
      const reactions = await prisma.medicineReaction.findMany({
        where: {
          child: {
            householdId
          }
        },
        include: {
          child: true,
          medicine: true
        },
        orderBy: { occurredAt: 'desc' }
      })
      
      return res.json(reactions)
    } catch (error) {
      console.error('Failed to fetch reactions:', error)
      return res.status(500).json({ error: 'Failed to fetch reactions' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        childId, 
        medicineId, 
        reactionType, 
        severity, 
        description, 
        symptoms, 
        occurredAt, 
        duration, 
        actionTaken, 
        notes 
      } = req.body

      if (!childId || !medicineId || !reactionType || !severity || !description || !occurredAt) {
        return res.status(400).json({ error: 'Missing required fields' })
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

      // Verify the medicine belongs to the household
      const medicine = await prisma.medicine.findFirst({
        where: {
          id: medicineId,
          child: {
            householdId
          }
        }
      })

      if (!medicine) {
        return res.status(400).json({ error: 'Medicine not found or does not belong to household' })
      }

      const reaction = await prisma.medicineReaction.create({
        data: {
          childId,
          medicineId,
          reactionType,
          severity,
          description,
          symptoms: symptoms || null,
          occurredAt: new Date(occurredAt),
          duration: duration || null,
          actionTaken: actionTaken || null,
          notes: notes || null
        },
        include: {
          child: true,
          medicine: true
        }
      })

      return res.json(reaction)
    } catch (error) {
      console.error('Failed to create reaction:', error)
      return res.status(500).json({ error: 'Failed to create reaction' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
