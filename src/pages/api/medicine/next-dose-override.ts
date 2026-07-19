import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'
import { parseRequiredDate } from '@/lib/medicine'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = req.query.householdId as string

  const context = await requireMembershipIn(req, res, householdId)
  if (!context) return

  if (req.method === 'POST') {
    try {
      const { medicineId, nextDoseOverride, overrideReason } = req.body

      if (!medicineId || !nextDoseOverride) {
        return res.status(400).json({ error: 'Missing required fields: medicineId, nextDoseOverride' })
      }
      const overrideDate = parseRequiredDate(nextDoseOverride)
      if (!overrideDate) return res.status(400).json({ error: 'Invalid next dose time' })
      const normalizedReason = typeof overrideReason === 'string' ? overrideReason.trim() : ''
      if (normalizedReason.length > 500) {
        return res.status(400).json({ error: 'Override reason is too long' })
      }

      // Verify the medicine belongs to the household
      const medicine = await prisma.medicine.findFirst({
        where: {
          id: medicineId,
          householdId,
          isTemplate: false,
          isActive: true,
        }
      })

      if (!medicine) {
        return res.status(404).json({ error: 'Medicine not found or does not belong to household' })
      }

      const updatedMedicine = await prisma.medicine.update({
        where: { id: medicineId },
        data: {
          nextDoseOverride: overrideDate,
          overrideReason: normalizedReason || null
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
          householdId,
          isTemplate: false,
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

export default withApiHandler(handler)
