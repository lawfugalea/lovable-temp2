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

  if (req.method === 'POST') {
    try {
      const { text, category } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Check if user can edit this note
      const note = await prisma.note.findFirst({
        where: {
          id,
          OR: [
            { ownerId: userId },
            { visibility: 'HOUSEHOLD' }
          ]
        }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }

      // Get the next order number
      const lastItem = await prisma.checklistItem.findFirst({
        where: { noteId: id },
        orderBy: { order: 'desc' }
      });

      const nextOrder = (lastItem?.order || 0) + 1;

      // Create the checklist item
      const item = await prisma.checklistItem.create({
        data: {
          noteId: id,
          text: text.trim(),
          category: category?.trim() || null,
          order: nextOrder
        }
      });

      return res.status(201).json(item);
    } catch (error) {
      console.error('Error creating checklist item:', error);
      return res.status(500).json({ error: 'Failed to create checklist item' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end('Method Not Allowed');
}
