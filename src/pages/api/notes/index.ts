import { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { recordActivity } from '@/lib/activity'
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

  switch (req.method) {
    case 'GET':
      return handleGetNotes(req, res, user)
    case 'POST':
      return handleCreateNote(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetNotes(req: NextApiRequest, res: NextApiResponse, user: NoteUser) {
  try {
    const { type = 'all', householdId } = req.query
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { householdId: true },
    })
    const householdIds = memberships.map(membership => membership.householdId)
    if (householdId && (typeof householdId !== 'string' || !householdIds.includes(householdId))) {
      return res.status(403).json({ error: 'Not a member of this household' })
    }

    const accessibleSharedNote = {
      isShared: true,
      householdId: { in: householdIds },
    }
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
        accessibleSharedNote,
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
        isShared: true,
        OR: [
          { createdById: user.id },
          { 
            collaborators: {
              some: {
                userId: user.id
              }
            }
          },
          accessibleSharedNote,
        ]
      }
    }

    // Filter by household if specified
    if (householdId && type !== 'personal') {
      whereClause.householdId = householdId
    }


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


    return res.status(200).json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return res.status(500).json({ error: 'Failed to fetch notes' })
  }
}

async function handleCreateNote(req: NextApiRequest, res: NextApiResponse, user: NoteUser) {
  try {
    const { title, content, contentJson, contentText, isShared, color, householdId } = req.body
    const normalizedTitle = typeof title === 'string' ? title.trim() : ''
    const errors = [
      validateOptionalText(content, 'Content', 200_000),
      validateOptionalText(contentText, 'Plain-text content', 200_000),
      validateContentJson(contentJson),
      validateNoteColor(color),
      validateOptionalBoolean(isShared, 'isShared'),
    ].filter(Boolean)

    if (!normalizedTitle || normalizedTitle.length > 200) {
      return res.status(400).json({ error: 'A title of 200 characters or fewer is required' })
    }
    if (errors.length) return res.status(400).json({ error: errors[0], details: errors })
    if (householdId !== undefined && householdId !== null && typeof householdId !== 'string') {
      return res.status(400).json({ error: 'Invalid household' })
    }

    const shared = isShared === true
    const effectiveHouseholdId = shared ? (householdId || user.activeHouseholdId) : null

    if (shared && !effectiveHouseholdId) {
      return res.status(400).json({ error: 'A household is required for shared notes' })
    }

    // Validate household access for shared notes
    if (shared && effectiveHouseholdId) {
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

    const note = await prisma.note.create({
      data: {
        title: normalizedTitle,
        content: typeof content === 'string' ? content : '',
        contentJson: contentJson ?? null,
        contentText: typeof contentText === 'string' ? contentText : '',
        isShared: shared,
        color: typeof color === 'string' ? color : 'yellow',
        createdById: user.id,
        householdId: effectiveHouseholdId
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

    // Only shared notes appear in the feed; a private note's title is private.
    if (shared && effectiveHouseholdId) {
      void recordActivity({
        householdId: effectiveHouseholdId,
        userId: user.id,
        module: 'notes',
        action: 'created',
        summary: `${note.createdBy?.name || 'Someone'} shared a note: ${normalizedTitle}`,
        targetId: note.id,
      })
    }

    return res.status(201).json({ note })
  } catch (error) {
    console.error('Error creating note:', error)
    return res.status(500).json({ error: 'Failed to create note' })
  }
}

export default withApiHandler(handler)
