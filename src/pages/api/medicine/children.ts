import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const { householdId } = req.query
    
    if (!householdId) {
      return res.status(400).json({ error: 'Household ID required' })
    }

    try {
      const children = await prisma.child.findMany({
        where: { householdId: householdId as string },
        orderBy: { createdAt: 'desc' }
      })
      
      res.setHeader('Cache-Control', 'no-store');
      return res.json(children)
    } catch (error) {
      console.error('Failed to fetch children:', error)
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).json({ error: 'Failed to fetch children' })
    }
  }

  if (req.method === 'POST') {
    const { householdId, name, dateOfBirth, notes } = req.body
    
    if (!householdId || !name || !dateOfBirth) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      const child = await prisma.child.create({
        data: {
          householdId,
          name,
          dateOfBirth: new Date(dateOfBirth),
          notes
        }
      })
      
      res.setHeader('Cache-Control', 'no-store');
      return res.json(child)
    } catch (error) {
      console.error('Failed to create child:', error)
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).json({ error: 'Failed to create child' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
