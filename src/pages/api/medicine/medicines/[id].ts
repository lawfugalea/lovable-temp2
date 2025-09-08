import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  const householdId = req.query.householdId as string

  if (!householdId) {
    return res.status(400).json({ error: 'Household ID required' })
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Medicine ID required' })
  }

  // Verify the medicine belongs to the household
  const existingMedicine = await prisma.medicine.findFirst({
    where: {
      id,
      child: {
        householdId
      }
    },
    include: {
      child: true
    }
  })

  if (!existingMedicine) {
    return res.status(404).json({ error: 'Medicine not found or does not belong to household' })
  }

  if (req.method === 'GET') {
    return res.json(existingMedicine)
  }

  if (req.method === 'PUT') {
    try {
      const { name, dosage, frequency, unit, instructions, isActive } = req.body

      if (!name || !dosage || !frequency) {
        return res.status(400).json({ error: 'Missing required fields: name, dosage, frequency' })
      }

      const updatedMedicine = await prisma.medicine.update({
        where: { id },
        data: {
          name,
          dosage: `${dosage} ${unit || 'mg'}`,
          frequency: `every ${frequency} hours`,
          notes: instructions || '',
          isActive: isActive !== undefined ? isActive : existingMedicine.isActive
        },
        include: {
          child: true
        }
      })

      return res.json(updatedMedicine)
    } catch (error) {
      console.error('Failed to update medicine:', error)
      return res.status(500).json({ error: 'Failed to update medicine' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if there are any doses associated with this medicine
      const doseCount = await prisma.medicineDose.count({
        where: { medicineId: id }
      })

      if (doseCount > 0) {
        // Soft delete - mark as inactive instead of hard delete
        await prisma.medicine.update({
          where: { id },
          data: { isActive: false }
        })
        return res.json({ message: 'Medicine deactivated (has associated doses)' })
      } else {
        // Hard delete if no doses
        await prisma.medicine.delete({
          where: { id }
        })
        return res.json({ message: 'Medicine deleted' })
      }
    } catch (error) {
      console.error('Failed to delete medicine:', error)
      return res.status(500).json({ error: 'Failed to delete medicine' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
