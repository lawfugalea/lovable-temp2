import { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'

type NoteUser = { id: string }

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const user: NoteUser = { id: userId }

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

async function handleGetCollaborators(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
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
          },
          {
            isShared: true,
            household: { members: { some: { userId: user.id } } },
          },
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

async function handleAddCollaborator(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
    const role = req.body?.role ?? 'VIEWER'

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if user is the creator of the note
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        createdById: user.id
      },
      select: { id: true, householdId: true, createdById: true, isShared: true },
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found or no permission to add collaborators' })
    }

    // Check if the user to be added exists
    if (!note.isShared || !note.householdId) {
      return res.status(400).json({ error: 'Share the note with a household before adding collaborators' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (targetUser.id === user.id) {
      return res.status(400).json({ error: 'The note owner is already an editor' })
    }
    if (role !== 'VIEWER' && role !== 'EDITOR') {
      return res.status(400).json({ error: 'Invalid collaborator role' })
    }
    const membership = await prisma.membership.findUnique({
      where: { userId_householdId: { userId, householdId: note.householdId } },
      select: { id: true },
    })
    if (!membership) return res.status(400).json({ error: 'Collaborator must belong to the note household' })

    const existingCollaboration = await prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId, userId } },
      select: { id: true },
    })
    const collaborator = await prisma.noteCollaborator.upsert({
      where: { noteId_userId: { noteId, userId } },
      create: {
        noteId,
        userId,
        role,
        addedById: user.id
      },
      update: { role, addedById: user.id },
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

    return res.status(existingCollaboration ? 200 : 201).json({ collaborator })
  } catch (error) {
    console.error('Error adding collaborator:', error)
    return res.status(500).json({ error: 'Failed to add collaborator' })
  }
}

async function handleRemoveCollaborator(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''

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

export default withApiHandler(handler)
