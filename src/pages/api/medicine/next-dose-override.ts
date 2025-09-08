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

  if (req.method === 'POST') {
    try {
      const { medicineId, nextDoseOverride, overrideReason } = req.body

      if (!medicineId || !nextDoseOverride) {
        return res.status(400).json({ error: 'Missing required fields: medicineId, nextDoseOverride' })
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
        return res.status(404).json({ error: 'Medicine not found or does not belong to household' })
      }

      const updatedMedicine = await prisma.medicine.update({
        where: { id: medicineId },
        data: {
          nextDoseOverride: new Date(nextDoseOverride),
          overrideReason: overrideReason || null
        },
        include: {
          child: true
        }
      })

      return res.json(updatedMedicine)
    } catch (error) {
      console.error('Failed to set next dose override:', error)
      return res.status(500).json({ error: 'Failed to set next dose override' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { medicineId } = req.body

      if (!medicineId) {
        return res.status(400).json({ error: 'Missing required field: medicineId' })
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
        return res.status(404).json({ error: 'Medicine not found or does not belong to household' })
      }

      const updatedMedicine = await prisma.medicine.update({
        where: { id: medicineId },
        data: {
          nextDoseOverride: null,
          overrideReason: null
        },
        include: {
          child: true
        }
      })

      return res.json(updatedMedicine)
    } catch (error) {
      console.error('Failed to clear next dose override:', error)
      return res.status(500).json({ error: 'Failed to clear next dose override' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
