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
      const { templates } = req.query
      
      // For templates, we need to get all children in the household to find templates
      // For active courses, we filter by child.householdId
      let whereClause: any
      
      if (templates === 'true') {
        // Templates are household-level and have childId: null
        whereClause = {
          isTemplate: true,
          childId: null
        }
      } else if (templates === 'false') {
        // Active courses are child-specific
        whereClause = {
          isTemplate: false,
          child: {
            householdId
          }
        }
      } else {
        // Get all medicines for the household (both templates and active courses)
        whereClause = {
          OR: [
            {
              isTemplate: true,
              childId: null
            },
            {
              isTemplate: false,
              child: {
                householdId
              }
            }
          ]
        }
      }
      
      const medicines = await prisma.medicine.findMany({
        where: whereClause,
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
      const { name, dosage, frequency, unit, instructions, childId, isTemplate, templateId } = req.body

      // For templates, childId is optional. For active courses, childId is required.
      if (isTemplate) {
        if (!name || !dosage || !frequency) {
          return res.status(400).json({ error: 'Missing required fields: name, dosage, frequency' })
        }
      } else {
        if (!name || !dosage || !frequency || !childId) {
          return res.status(400).json({ error: 'Missing required fields: name, dosage, frequency, childId' })
        }
      }

      // If creating an active course, verify the child belongs to the household
      if (!isTemplate && childId) {
        const child = await prisma.child.findFirst({
          where: {
            id: childId,
            householdId
          }
        })

        if (!child) {
          return res.status(400).json({ error: 'Child not found or does not belong to household' })
        }
      }

      // If starting a course from a template, get template data
      let templateData: { name?: string; dosage?: string; frequency?: string; notes?: string } = {}
      if (templateId && !isTemplate) {
        const template = await prisma.medicine.findFirst({
          where: {
            id: templateId,
            isTemplate: true,
            childId: null
          }
        })
        
        if (!template) {
          return res.status(400).json({ error: 'Template not found' })
        }
        
        templateData = {
          name: template.name,
          dosage: template.dosage,
          frequency: template.frequency,
          notes: template.notes || undefined
        }
      }

      const medicine = await prisma.medicine.create({
        data: {
          name: templateData.name || name,
          dosage: templateData.dosage || (dosage.includes(unit || 'mg') ? dosage : `${dosage} ${unit || 'mg'}`),
          frequency: templateData.frequency || (frequency.toLowerCase().includes('every') ? frequency : `every ${frequency} hours`),
          notes: templateData.notes || instructions || '',
          childId: isTemplate ? null : childId,
          startDate: new Date(),
          isTemplate: isTemplate || false,
          isActive: isTemplate ? false : true // Templates should be inactive, active courses should be active
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

  if (req.method === 'PATCH') {
    try {
      const { medicineId, action, ...updateData } = req.body

      if (!medicineId) {
        return res.status(400).json({ error: 'Medicine ID required' })
      }

      // Verify the medicine belongs to the household
      const existingMedicine = await prisma.medicine.findFirst({
        where: {
          id: medicineId,
          child: { householdId }
        }
      })

      if (!existingMedicine) {
        return res.status(404).json({ error: 'Medicine not found' })
      }

      let updatedMedicine

      if (action === 'stop') {
        // Stop an active course (set isActive to false)
        updatedMedicine = await prisma.medicine.update({
          where: { id: medicineId },
          data: { isActive: false },
          include: { child: true }
        })
      } else if (action === 'update') {
        // Update medicine data
        updatedMedicine = await prisma.medicine.update({
          where: { id: medicineId },
          data: updateData,
          include: { child: true }
        })
      } else {
        return res.status(400).json({ error: 'Invalid action' })
      }

      return res.json(updatedMedicine)
    } catch (error) {
      console.error('Failed to update medicine:', error)
      return res.status(500).json({ error: 'Failed to update medicine' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}