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

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Note ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetNote(req, res, user, id)
    case 'PUT':
      return handleUpdateNote(req, res, user, id)
    case 'DELETE':
      return handleDeleteNote(req, res, user, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetNote(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
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

    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }

    return res.status(200).json({ note })
  } catch (error) {
    console.error('Error fetching note:', error)
    return res.status(500).json({ error: 'Failed to fetch note' })
  }
}

async function handleUpdateNote(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
    const { title, content, color, isPinned, isArchived, isShared, householdId } = req.body

    // Check if user has permission to edit this note
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { createdById: user.id }, // Owner can always edit
          { 
            collaborators: {
              some: {
                userId: user.id,
                role: 'EDITOR'
              }
            }
          }
        ]
      }
    })

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found or no permission to edit' })
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

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (color !== undefined) updateData.color = color
    if (isPinned !== undefined) updateData.isPinned = isPinned
    if (isArchived !== undefined) updateData.isArchived = isArchived
    if (isShared !== undefined) updateData.isShared = isShared
    if (householdId !== undefined) updateData.householdId = isShared ? householdId : null

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
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

    return res.status(200).json({ note })
  } catch (error) {
    console.error('Error updating note:', error)
    return res.status(500).json({ error: 'Failed to update note' })
  }
}

async function handleDeleteNote(req: NextApiRequest, res: NextApiResponse, user: any, noteId: string) {
  try {
    // Only the creator can delete a note
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        createdById: user.id
      }
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found or no permission to delete' })
    }

    await prisma.note.delete({
      where: { id: noteId }
    })

    return res.status(200).json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return res.status(500).json({ error: 'Failed to delete note' })
  }
}
