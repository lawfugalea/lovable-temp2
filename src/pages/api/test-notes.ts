import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== TEST NOTES API ===')
    console.log('Method:', req.method)
    console.log('Query:', req.query)
    console.log('Body:', req.body)
    
    const session = await getServerSession(req, res, authOptions)
    console.log('Session:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email,
      email: session?.user?.email 
    })
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get all notes for this user
    const notes = await prisma.note.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { 
            collaborators: {
              some: {
                userId: user.id
              }
            }
          },
          {
            isShared: true,
            household: {
              memberships: {
                some: {
                  userId: user.id
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        isShared: true,
        householdId: true,
        createdById: true
      }
    })

    return res.status(200).json({ 
      message: 'Test API working',
      user: { id: user.id, email: user.email },
      notes: notes,
      noteCount: notes.length
    })
  } catch (error) {
    console.error('=== ERROR IN TEST API ===', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
