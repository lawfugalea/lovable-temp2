import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { householdId } = req.query

  if (!householdId || typeof householdId !== 'string') {
    return res.status(400).json({ error: 'Household ID is required' })
  }

  try {
    // Verify user has access to this household
    const household = await prisma.household.findFirst({
      where: {
        id: householdId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      }
    })

    if (!household) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (req.method === 'GET') {
      const { childId, startDate, endDate } = req.query
      
      const where: any = {
        child: {
          householdId: householdId
        }
      }

      if (childId && typeof childId === 'string') {
        where.childId = childId
      }

      if (startDate && typeof startDate === 'string') {
        where.takenAt = { ...where.takenAt, gte: new Date(startDate) }
      }

      if (endDate && typeof endDate === 'string') {
        where.takenAt = { ...where.takenAt, lte: new Date(endDate) }
      }

      const readings = await prisma.feverReading.findMany({
        where,
        include: {
          child: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true
            }
          }
        },
        orderBy: {
          takenAt: 'desc'
        }
      })

      return res.status(200).json(readings)
    }

    if (req.method === 'POST') {
      const { childId, temperature, unit = 'C', method = 'oral', notes, takenBy, takenAt } = req.body

      if (!childId || temperature === undefined) {
        return res.status(400).json({ error: 'Child ID and temperature are required' })
      }

      // Verify child belongs to household
      const child = await prisma.child.findFirst({
        where: {
          id: childId,
          householdId: householdId
        }
      })

      if (!child) {
        return res.status(404).json({ error: 'Child not found' })
      }

      const reading = await prisma.feverReading.create({
        data: {
          childId,
          temperature: parseFloat(temperature),
          unit,
          method,
          notes,
          takenBy,
          takenAt: takenAt ? new Date(takenAt) : new Date()
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true
            }
          }
        }
      })

      return res.status(201).json(reading)
    }

    if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Reading ID is required' })
      }

      // Verify reading belongs to household
      const reading = await prisma.feverReading.findFirst({
        where: {
          id,
          child: {
            householdId: householdId
          }
        }
      })

      if (!reading) {
        return res.status(404).json({ error: 'Reading not found' })
      }

      await prisma.feverReading.delete({
        where: { id }
      })

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Fever readings API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
