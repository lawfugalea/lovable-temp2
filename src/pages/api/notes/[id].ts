import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { 
    res.status(401).json({ error: 'Unauthorized' }); 
    return null; 
  }
  return userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  if (req.method === 'GET') {
    try {
      const note = await prisma.note.findFirst({
        where: {
          id,
          OR: [
            { visibility: 'HOUSEHOLD' },
            { ownerId: userId }
          ]
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          checklistItems: {
            orderBy: { order: 'asc' }
          },
          images: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      return res.status(200).json(note);
    } catch (error) {
      console.error('Error fetching note:', error);
      return res.status(500).json({ error: 'Failed to fetch note' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { title, content, color, isPinned, visibility, type } = req.body;

      // Check if user can edit this note
      const existingNote = await prisma.note.findFirst({
        where: {
          id,
          OR: [
            { ownerId: userId },
            { visibility: 'HOUSEHOLD' }
          ]
        }
      });

      if (!existingNote) {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }

      // Update the note
      const updatedNote = await prisma.note.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(content !== undefined && { content }),
          ...(color !== undefined && { color }),
          ...(isPinned !== undefined && { isPinned }),
          ...(visibility !== undefined && { visibility }),
          ...(type !== undefined && { type })
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          checklistItems: {
            orderBy: { order: 'asc' }
          },
          images: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      // If switching to checklist, just return the updated note without default items
      // Users can add their own items as needed

      return res.status(200).json(updatedNote);
    } catch (error) {
      console.error('Error updating note:', error);
      return res.status(500).json({ error: 'Failed to update note' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if user can delete this note (only owner)
      const existingNote = await prisma.note.findFirst({
        where: {
          id,
          ownerId: userId
        }
      });

      if (!existingNote) {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }

      await prisma.note.delete({
        where: { id }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting note:', error);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}