import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
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

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Note ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetCollaborators(req, res, user, id)
    case 'POST':
      return handleAddCollaborator(req, res, user, id)
    case 'DELETE':
      return handleRemoveCollaborator(req, res, user, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetCollaborators(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
    // Check if user has access to this note
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { createdById: user.id },
          { 
            collaborators: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      }
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }

    const collaborators = await prisma.noteCollaborator.findMany({
      where: { noteId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return res.status(200).json({ collaborators })
  } catch (error) {
    console.error('Error fetching collaborators:', error)
    return res.status(500).json({ error: 'Failed to fetch collaborators' })
  }
}

async function handleAddCollaborator(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
    const { userId, role = 'VIEWER' } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if user is the creator of the note
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        createdById: user.id
      }
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found or no permission to add collaborators' })
    }

    // Check if the user to be added exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if user is already a collaborator
    const existingCollaboration = await prisma.noteCollaborator.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId
        }
      }
    })

    if (existingCollaboration) {
      return res.status(400).json({ error: 'User is already a collaborator' })
    }

    const collaborator = await prisma.noteCollaborator.create({
      data: {
        noteId,
        userId,
        role,
        addedById: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return res.status(201).json({ collaborator })
  } catch (error) {
    console.error('Error adding collaborator:', error)
    return res.status(500).json({ error: 'Failed to add collaborator' })
  }
}

async function handleRemoveCollaborator(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if user is the creator of the note
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        createdById: user.id
      }
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found or no permission to remove collaborators' })
    }

    const collaborator = await prisma.noteCollaborator.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId
        }
      }
    })

    if (!collaborator) {
      return res.status(404).json({ error: 'Collaborator not found' })
    }

    await prisma.noteCollaborator.delete({
      where: {
        noteId_userId: {
          noteId,
          userId
        }
      }
    })

    return res.status(200).json({ message: 'Collaborator removed successfully' })
  } catch (error) {
    console.error('Error removing collaborator:', error)
    return res.status(500).json({ error: 'Failed to remove collaborator' })
  }
}
