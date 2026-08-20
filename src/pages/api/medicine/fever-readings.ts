import { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { parseRequiredDate } from '@/lib/medicine'
import { requireMembershipIn } from '@/lib/api-guards'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { householdId: queryHouseholdId } = req.query
  const { householdId: bodyHouseholdId } = req.body || {}
  
  // For GET requests, householdId should be in query params
  // For POST requests, householdId can be in either query params or body
  const householdId = queryHouseholdId || bodyHouseholdId

  if (!householdId || typeof householdId !== 'string') {
    return res.status(400).json({ error: 'Household ID is required' })
  }

  const membership = await requireMembershipIn(req, res, householdId)
  if (!membership) return

  try {
    if (req.method === 'GET') {
      const { childId, startDate, endDate } = req.query
      const parsedStartDate = startDate && typeof startDate === 'string' ? parseRequiredDate(startDate) : null
      const parsedEndDate = endDate && typeof endDate === 'string' ? parseRequiredDate(endDate) : null
      if ((startDate && !parsedStartDate) || (endDate && !parsedEndDate)) {
        return res.status(400).json({ error: 'Invalid date range' })
      }
      if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        return res.status(400).json({ error: 'Start date must be before end date' })
      }
      
      const where: any = {
        child: {
          householdId: householdId
        }
      }

      if (childId && typeof childId === 'string') {
        where.childId = childId
      }

      if (parsedStartDate) {
        where.takenAt = { ...where.takenAt, gte: parsedStartDate }
      }

      if (parsedEndDate) {
        where.takenAt = { ...where.takenAt, lte: parsedEndDate }
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
      
      const { childId, episodeId, temperature, unit = 'C', method = 'oral', notes, takenAt } = req.body

      if (!childId || !episodeId || temperature === undefined) {
        return res.status(400).json({ error: 'Episode, child, and temperature are required' })
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
      const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } })
      if (!episode) return res.status(400).json({ error: 'Episode does not belong to the selected child and household' })

      const numericTemperature = Number(temperature)
      const takenAtDate = takenAt ? parseRequiredDate(takenAt) : new Date()
      const normalizedNotes = typeof notes === 'string' ? notes.trim() : null
      const validRange = unit === 'F'
        ? numericTemperature >= 86 && numericTemperature <= 113
        : unit === 'C' && numericTemperature >= 30 && numericTemperature <= 45
      const validMethods = new Set(['oral', 'rectal', 'axillary', 'ear', 'forehead'])
      if (!takenAtDate || !validRange || !validMethods.has(method)
        || (normalizedNotes?.length || 0) > 2000) {
        return res.status(400).json({ error: 'Invalid temperature, unit, method, or time' })
      }

      const reading = await prisma.feverReading.create({
        data: {
          childId,
          episodeId,
          temperature: numericTemperature,
          unit,
          method,
          notes: normalizedNotes,
          takenBy: membership.userId,
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
      
      const { id, childId, episodeId, temperature, unit = 'C', method = 'oral', notes, takenAt } = req.body

      if (!id || !childId || !episodeId || temperature === undefined) {
        return res.status(400).json({ error: 'Reading ID, episode, child, and temperature are required' })
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
        return res.status(404).json({ error: 'Child not found' })
      }
      const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } })
      if (!episode) return res.status(400).json({ error: 'Episode does not belong to the selected child and household' })

      const numericTemperature = Number(temperature)
      const takenAtDate = takenAt ? parseRequiredDate(takenAt) : existingReading.takenAt
      const normalizedNotes = typeof notes === 'string' ? notes.trim() : null
      const validRange = unit === 'F'
        ? numericTemperature >= 86 && numericTemperature <= 113
        : unit === 'C' && numericTemperature >= 30 && numericTemperature <= 45
      const validMethods = new Set(['oral', 'rectal', 'axillary', 'ear', 'forehead'])
      if (!takenAtDate || !validRange || !validMethods.has(method)
        || (normalizedNotes?.length || 0) > 2000) {
        return res.status(400).json({ error: 'Invalid temperature, unit, method, or time' })
      }

      const updatedReading = await prisma.feverReading.update({
        where: { id },
        data: {
          childId,
          episodeId,
          temperature: numericTemperature,
          unit,
          method,
          notes: normalizedNotes,
          takenBy: membership.userId,
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

export default withApiHandler(handler)
