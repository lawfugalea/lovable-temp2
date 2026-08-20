import { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { deleteNoteAttachmentFiles } from '@/lib/note-attachment-files'
import { getUserIdOr401 } from '@/lib/api-guards'
import {
  validateContentJson,
  validateNoteColor,
  validateOptionalBoolean,
  validateOptionalText,
} from '@/lib/note-validation'

type NoteUser = { id: string; activeHouseholdId: string | null }

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, activeHouseholdId: true },
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

async function handleGetNote(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
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
          },
          {
            isShared: true,
            household: { members: { some: { userId: user.id } } }
          },
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

async function handleUpdateNote(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
  try {
    const { title, content, contentJson, contentText, color, isPinned, isArchived, isShared, householdId } = req.body
    const errors = [
      validateOptionalText(content, 'Content', 200_000),
      validateOptionalText(contentText, 'Plain-text content', 200_000),
      validateContentJson(contentJson),
      validateNoteColor(color),
      validateOptionalBoolean(isPinned, 'isPinned'),
      validateOptionalBoolean(isArchived, 'isArchived'),
      validateOptionalBoolean(isShared, 'isShared'),
    ].filter(Boolean)
    if (errors.length) return res.status(400).json({ error: errors[0], details: errors })
    if (householdId !== undefined && householdId !== null && typeof householdId !== 'string') {
      return res.status(400).json({ error: 'Invalid household' })
    }

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

    const isOwner = existingNote.createdById === user.id
    const changesOwnerOnlyState = (isShared !== undefined && isShared !== existingNote.isShared)
      || (householdId !== undefined && householdId !== existingNote.householdId)
      || (isPinned !== undefined && isPinned !== existingNote.isPinned)
      || (isArchived !== undefined && isArchived !== existingNote.isArchived)
    if (!isOwner && changesOwnerOnlyState) {
      return res.status(403).json({ error: 'Only the note owner can change sharing or status' })
    }

    const effectiveHouseholdId = isShared === false
      ? null
      : householdId || existingNote.householdId || user.activeHouseholdId
    if (isShared === true && !effectiveHouseholdId) {
      return res.status(400).json({ error: 'A household is required for shared notes' })
    }

    // Validate household access for shared notes
    if (isOwner && isShared === true && effectiveHouseholdId) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_householdId: {
            userId: user.id,
            householdId: effectiveHouseholdId
          }
        }
      })

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this household' })
      }
    }

    const updateData: any = {}
    if (title !== undefined) {
      const normalizedTitle = typeof title === 'string' ? title.trim() : ''
      if (!normalizedTitle || normalizedTitle.length > 200) {
        return res.status(400).json({ error: 'A title of 200 characters or fewer is required' })
      }
      updateData.title = normalizedTitle
    }
    if (content !== undefined) updateData.content = content
    if (contentJson !== undefined) updateData.contentJson = contentJson
    if (contentText !== undefined) updateData.contentText = contentText
    if (color !== undefined) updateData.color = color
    if (isOwner && isPinned !== undefined) updateData.isPinned = isPinned
    if (isOwner && isArchived !== undefined) updateData.isArchived = isArchived
    if (isOwner && isShared !== undefined) {
      updateData.isShared = isShared
      updateData.householdId = effectiveHouseholdId
    }

    const note = await prisma.$transaction(async tx => {
      const updated = await tx.note.update({
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
      if (isOwner && isShared === false) {
        await tx.noteCollaborator.deleteMany({ where: { noteId } })
        updated.collaborators = []
      }
      return updated
    })

    return res.status(200).json({ note })
  } catch (error) {
    console.error('Error updating note:', error)
    return res.status(500).json({ error: 'Failed to update note' })
  }
}

async function handleDeleteNote(req: NextApiRequest, res: NextApiResponse, user: NoteUser, noteId: string) {
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

    // Read the filenames before the delete: the cascade removes the rows, and
    // with them the only record of which files on disk belonged to this note.
    const attachments = await prisma.noteAttachment.findMany({
      where: { noteId },
      select: { filename: true },
    })

    await prisma.note.delete({
      where: { id: noteId }
    })

    deleteNoteAttachmentFiles(attachments.map(attachment => attachment.filename))

    return res.status(200).json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return res.status(500).json({ error: 'Failed to delete note' })
  }
}

export default withApiHandler(handler)
