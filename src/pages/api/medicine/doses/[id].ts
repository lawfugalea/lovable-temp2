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
    return res.status(400).json({ error: 'Dose ID required' })
  }

  // Verify the dose belongs to the household
  const existingDose = await prisma.medicineDose.findFirst({
    where: {
      id,
      child: {
        householdId
      }
    },
    include: {
      child: true,
      medicine: true
    }
  })

  if (!existingDose) {
    return res.status(404).json({ error: 'Dose not found or does not belong to household' })
  }

  if (req.method === 'GET') {
    return res.json(existingDose)
  }

  if (req.method === 'PUT') {
    try {
      const { takenAt, dosage, notes } = req.body

      if (!takenAt || !dosage) {
        return res.status(400).json({ error: 'Missing required fields: takenAt, dosage' })
      }

      const updatedDose = await prisma.medicineDose.update({
        where: { id },
        data: {
          takenAt: new Date(takenAt),
          dosage,
          notes: notes || ''
        },
        include: {
          child: true,
          medicine: true
        }
      })

      return res.json(updatedDose)
    } catch (error) {
      console.error('Failed to update dose:', error)
      return res.status(500).json({ error: 'Failed to update dose' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.medicineDose.delete({
        where: { id }
      })
      return res.json({ message: 'Dose deleted' })
    } catch (error) {
      console.error('Failed to delete dose:', error)
      return res.status(500).json({ error: 'Failed to delete dose' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
