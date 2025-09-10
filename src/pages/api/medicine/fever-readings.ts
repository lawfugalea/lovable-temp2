import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { householdId: queryHouseholdId } = req.query
  const { householdId: bodyHouseholdId } = req.body || {}
  
  // For GET requests, householdId should be in query params
  // For POST requests, householdId can be in either query params or body
  const householdId = queryHouseholdId || bodyHouseholdId

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
      console.log('POST /api/medicine/fever-readings - Request body:', req.body)
      console.log('POST /api/medicine/fever-readings - Query params:', req.query)
      
      const { childId, temperature, unit = 'C', method = 'oral', notes, takenBy, takenAt } = req.body

      if (!childId || temperature === undefined) {
        console.log('Validation failed:', { childId, temperature })
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
        console.log('Child not found:', { childId, householdId })
        return res.status(404).json({ error: 'Child not found' })
      }

      // Handle datetime-local input which comes as "2024-01-15T14:30"
      // This is local time, so we need to treat it as such
      let takenAtDate
      if (takenAt && takenAt.includes('T') && !takenAt.includes('Z') && !takenAt.includes('+')) {
        // This is a datetime-local format, treat as local time
        const [datePart, timePart] = takenAt.split('T')
        const [year, month, day] = datePart.split('-')
        const [hour, minute] = timePart.split(':')
        takenAtDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
      } else {
        takenAtDate = takenAt ? new Date(takenAt) : new Date()
      }

      const reading = await prisma.feverReading.create({
        data: {
          childId,
          temperature: parseFloat(temperature),
          unit,
          method,
          notes,
          takenBy,
          takenAt: takenAtDate
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

    if (req.method === 'PUT') {
      console.log('PUT /api/medicine/fever-readings - Request body:', req.body)
      
      const { id, childId, temperature, unit = 'C', method = 'oral', notes, takenBy, takenAt } = req.body

      if (!id || !childId || temperature === undefined) {
        console.log('Validation failed:', { id, childId, temperature })
        return res.status(400).json({ error: 'Reading ID, child ID and temperature are required' })
      }

      // Verify reading belongs to household
      const existingReading = await prisma.feverReading.findFirst({
        where: {
          id,
          child: {
            householdId: householdId
          }
        }
      })

      if (!existingReading) {
        console.log('Reading not found:', { id, householdId })
        return res.status(404).json({ error: 'Reading not found' })
      }

      // Verify child belongs to household
      const child = await prisma.child.findFirst({
        where: {
          id: childId,
          householdId: householdId
        }
      })

      if (!child) {
        console.log('Child not found:', { childId, householdId })
        return res.status(404).json({ error: 'Child not found' })
      }

      // Handle datetime-local input which comes as "2024-01-15T14:30"
      // This is local time, so we need to treat it as such
      let takenAtDate
      if (takenAt && takenAt.includes('T') && !takenAt.includes('Z') && !takenAt.includes('+')) {
        // This is a datetime-local format, treat as local time
        const [datePart, timePart] = takenAt.split('T')
        const [year, month, day] = datePart.split('-')
        const [hour, minute] = timePart.split(':')
        takenAtDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
      } else {
        takenAtDate = takenAt ? new Date(takenAt) : existingReading.takenAt
      }

      const updatedReading = await prisma.feverReading.update({
        where: { id },
        data: {
          childId,
          temperature: parseFloat(temperature),
          unit,
          method,
          notes,
          takenBy,
          takenAt: takenAtDate
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

      return res.status(200).json(updatedReading)
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
