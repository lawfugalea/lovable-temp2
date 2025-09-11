import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== NOTES API HANDLER START ===')
    console.log('Method:', req.method)
    console.log('Query:', req.query)
    console.log('Body:', req.body)
    
    if (req.method === 'PUT') {
      console.log('PUT request - updating note in database')
      
      const session = await getServerSession(req, res, authOptions)
      console.log('Session:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        hasEmail: !!session?.user?.email,
        email: session?.user?.email 
      })
      
      if (!session?.user?.email) {
        console.log('No session or email, returning 401')
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      
      console.log('User lookup:', { 
        found: !!user, 
        userId: user?.id, 
        email: user?.email 
      })

      if (!user) {
        console.log('User not found, returning 404')
        return res.status(404).json({ error: 'User not found' })
      }

      const noteId = req.query.id as string
      console.log('Updating note:', noteId)

      // Check note permissions - owner or shared note with household access
      console.log('Checking note permissions for:', { noteId, userId: user.id })
      
      // First check if user is owner
      const ownerNote = await prisma.note.findFirst({
        where: {
          id: noteId,
          createdById: user.id
        }
      })
      
      if (ownerNote) {
        console.log('User is owner of note')
        var existingNote = ownerNote
      } else {
        console.log('User is not owner, checking shared note permissions...')
        
        // Check if it's a shared note and user is household member
        const sharedNote = await prisma.note.findFirst({
          where: {
            id: noteId,
            isShared: true
          }
        })
        
        if (!sharedNote) {
          console.log('Note is not shared')
          return res.status(404).json({ error: 'Note not found or no permission' })
        }
        
        console.log('Note is shared, checking household membership...')
        
        // Check if user is member of the household
        const membership = await prisma.membership.findFirst({
          where: {
            userId: user.id,
            householdId: sharedNote.householdId || undefined
          }
        })
        
        if (!membership) {
          console.log('User is not a member of the household')
          return res.status(404).json({ error: 'Note not found or no permission' })
        }
        
        console.log('User is household member, can edit shared note')
        var existingNote = sharedNote
      }

      console.log('Found existing note:', {
        id: existingNote.id,
        isShared: existingNote.isShared,
        householdId: existingNote.householdId,
        createdById: existingNote.createdById
      })

      // Prepare update data
      const updateData: any = {}
      const { title, content, contentJson, contentText, color, isPinned, isArchived, isShared, householdId } = req.body
      
      if (title !== undefined) updateData.title = title
      if (content !== undefined) updateData.content = content
      if (contentJson !== undefined) updateData.contentJson = contentJson
      if (contentText !== undefined) updateData.contentText = contentText
      if (color !== undefined) updateData.color = color
      if (isPinned !== undefined) updateData.isPinned = isPinned
      if (isArchived !== undefined) updateData.isArchived = isArchived
      if (isShared !== undefined) updateData.isShared = isShared
      
      // Handle householdId based on the final isShared status
      const finalIsShared = isShared !== undefined ? isShared : existingNote.isShared
      if (finalIsShared) {
        updateData.householdId = householdId || existingNote.householdId
      } else {
        updateData.householdId = null
      }

      console.log('Updating note with data:', updateData)

      // Update the note with minimal includes
      console.log('About to update database...')
      const updatedNote = await prisma.note.update({
        where: { id: noteId },
        data: updateData,
        select: {
          id: true,
          title: true,
          content: true,
          contentJson: true,
          contentText: true,
          isShared: true,
          color: true,
          isPinned: true,
          isArchived: true,
          householdId: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
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

      // Add collaborators array to match expected structure
      const responseNote = {
        ...updatedNote,
        collaborators: []
      }

      console.log('Database update successful:', { noteId: responseNote.id, title: responseNote.title })
      return res.status(200).json({ note: responseNote })
    }

    if (req.method === 'DELETE') {
      console.log('DELETE request - deleting note')
      
      const session = await getServerSession(req, res, authOptions)
      console.log('Session:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        hasEmail: !!session?.user?.email,
        email: session?.user?.email 
      })
      
      if (!session?.user?.email) {
        console.log('No session or email, returning 401')
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      
      console.log('User lookup:', { 
        found: !!user, 
        userId: user?.id, 
        email: user?.email 
      })

      if (!user) {
        console.log('User not found, returning 404')
        return res.status(404).json({ error: 'User not found' })
      }

      const noteId = req.query.id as string
      console.log('Deleting note:', noteId)
      
      return await handleDeleteNote(req, res, user, noteId)
    }
    
    // Method not allowed
    console.log('Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN NOTES API ===', error)
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' })
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