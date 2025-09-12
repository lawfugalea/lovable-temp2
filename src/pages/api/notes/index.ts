import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetNotes(req, res, user)
    case 'POST':
      return handleCreateNote(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetNotes(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { type = 'all', householdId } = req.query
    
    console.log('API: Getting notes with params:', { type, householdId, userId: user.id })
    
    // Get user's household memberships to find shared notes
    const userMemberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { householdId: true }
    })
    const userHouseholdIds = userMemberships.map(m => m.householdId)
    
    console.log('API: User household IDs:', userHouseholdIds)
    
    let whereClause: any = {
      OR: [
        { createdById: user.id }, // User's own notes
        { 
          collaborators: {
            some: {
              userId: user.id
            }
          }
        }, // Notes where user is a collaborator
        {
          // Shared notes from user's households
          isShared: true,
          householdId: {
            in: userHouseholdIds
          }
        }
      ]
    }

    // Filter by type
    if (type === 'personal') {
      whereClause = {
        createdById: user.id,
        isShared: false
      }
    } else if (type === 'shared') {
      whereClause = {
        OR: [
          { 
            createdById: user.id,
            isShared: true
          },
          { 
            collaborators: {
              some: {
                userId: user.id
              }
            }
          },
          {
            // Shared notes from user's households
            isShared: true,
            householdId: {
              in: userHouseholdIds
            }
          }
        ]
      }
    }

    // Filter by household if specified
    if (householdId && type !== 'personal') {
      whereClause.householdId = householdId
    }

    console.log('API: Final whereClause:', JSON.stringify(whereClause, null, 2))

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        household: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    console.log('API: Found notes:', notes.length)
    console.log('API: Notes data:', notes.map(n => ({ id: n.id, title: n.title, isShared: n.isShared, householdId: n.householdId, color: n.color })))
    console.log('API: First note full data:', notes[0])

    return res.status(200).json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return res.status(500).json({ error: 'Failed to fetch notes' })
  }
}

async function handleCreateNote(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { title, content, contentJson, contentText, isShared, color, householdId } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    // Validate household access for shared notes
    if (isShared && householdId) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_householdId: {
            userId: user.id,
            householdId: householdId
          }
        }
      })

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this household' })
      }
    }

    const note = await prisma.note.create({
      data: {
        title,
        content: content || '',
        contentJson: contentJson || null,
        contentText: contentText || '',
        isShared: isShared || false,
        color: color || 'yellow',
        createdById: user.id,
        householdId: isShared ? householdId : null
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        household: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return res.status(201).json({ note })
  } catch (error) {
    console.error('Error creating note:', error)
    return res.status(500).json({ error: 'Failed to create note' })
  }
}
