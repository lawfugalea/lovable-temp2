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
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  if (req.method === 'PUT') {
    try {
      const { text, isChecked, category } = req.body;

      // Check if user can edit this checklist item
      const item = await prisma.checklistItem.findFirst({
        where: { id },
        include: {
          note: {
            select: { 
              ownerId: true, 
              visibility: true, 
              householdId: true,
              household: {
                select: {
                  members: {
                    select: { userId: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!item) {
        return res.status(404).json({ error: 'Checklist item not found' });
      }

      // Check permissions (owner or household members can edit)
      const isOwner = item.note.ownerId === userId;
      const isHouseholdMember = item.note.household.members.some(member => member.userId === userId);
      const canEdit = isOwner || (item.note.visibility === 'HOUSEHOLD' && isHouseholdMember);
      
      if (!canEdit) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the item
      const updatedItem = await prisma.checklistItem.update({
        where: { id },
        data: {
          ...(text !== undefined && { text: text.trim() }),
          ...(isChecked !== undefined && { isChecked }),
          ...(category !== undefined && { category: category === 'General' ? null : category })
        }
      });

      return res.status(200).json(updatedItem);
    } catch (error) {
      console.error('Error updating checklist item:', error);
      return res.status(500).json({ error: 'Failed to update checklist item' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if user can delete this checklist item
      const item = await prisma.checklistItem.findFirst({
        where: { id },
        include: {
          note: {
            select: { 
              ownerId: true, 
              visibility: true, 
              householdId: true,
              household: {
                select: {
                  members: {
                    select: { userId: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!item) {
        return res.status(404).json({ error: 'Checklist item not found' });
      }

      // Check permissions (owner or household members can delete)
      const isOwner = item.note.ownerId === userId;
      const isHouseholdMember = item.note.household.members.some(member => member.userId === userId);
      const canDelete = isOwner || (item.note.visibility === 'HOUSEHOLD' && isHouseholdMember);
      
      if (!canDelete) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.checklistItem.delete({
        where: { id }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      return res.status(500).json({ error: 'Failed to delete checklist item' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
