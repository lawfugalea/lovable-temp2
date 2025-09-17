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

  if (req.method === 'GET') {
    try {
      // Get user's active household
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeHouseholdId: true, email: true, name: true }
      });

      if (!user?.activeHouseholdId) {
        console.log('User has no active household, creating default household...');
        
        // Check if user has any household membership
        const membership = await prisma.membership.findFirst({
          where: { userId },
          select: { householdId: true }
        });

        if (membership) {
          // Set existing household as active
          await prisma.user.update({
            where: { id: userId },
            data: { activeHouseholdId: membership.householdId }
          });
          user = { ...user, activeHouseholdId: membership.householdId };
        } else {
          // Create a default household
          const defaultName = (user.name?.split(' ')[0] || user.email?.split('@')[0] || 'My') + "'s Household";
          
          const household = await prisma.$transaction(async (tx) => {
            const h = await tx.household.create({
              data: { name: defaultName, ownerId: userId },
              select: { id: true }
            });

            await tx.membership.create({
              data: { userId, householdId: h.id, role: 'OWNER' }
            });

            await tx.user.update({
              where: { id: userId },
              data: { activeHouseholdId: h.id }
            });

            return h;
          });

          user = { ...user, activeHouseholdId: household.id };
          console.log('Created default household:', household.id);
        }
      }

      // Get notes for the household
      const notes = await prisma.note.findMany({
        where: {
          householdId: user.activeHouseholdId,
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
        },
        orderBy: [
          { isPinned: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      return res.status(200).json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, content, type, color, visibility } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Get user's active household (reuse the same logic as GET)
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeHouseholdId: true, email: true, name: true }
      });

      if (!user?.activeHouseholdId) {
        console.log('User has no active household for POST, creating default household...');
        
        // Check if user has any household membership
        const membership = await prisma.membership.findFirst({
          where: { userId },
          select: { householdId: true }
        });

        if (membership) {
          // Set existing household as active
          await prisma.user.update({
            where: { id: userId },
            data: { activeHouseholdId: membership.householdId }
          });
          user = { ...user, activeHouseholdId: membership.householdId };
        } else {
          // Create a default household
          const defaultName = (user.name?.split(' ')[0] || user.email?.split('@')[0] || 'My') + "'s Household";
          
          const household = await prisma.$transaction(async (tx) => {
            const h = await tx.household.create({
              data: { name: defaultName, ownerId: userId },
              select: { id: true }
            });

            await tx.membership.create({
              data: { userId, householdId: h.id, role: 'OWNER' }
            });

            await tx.user.update({
              where: { id: userId },
              data: { activeHouseholdId: h.id }
            });

            return h;
          });

          user = { ...user, activeHouseholdId: household.id };
          console.log('Created default household for POST:', household.id);
        }
      }

      // Create the note
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: content || '',
          type: type || 'TEXT',
          color: color || 'yellow',
          visibility: visibility || 'HOUSEHOLD',
          householdId: user.activeHouseholdId,
          ownerId: userId
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          checklistItems: {
            orderBy: { order: 'asc' }
          },
        }
      });

      // If it's a checklist note, add some default items based on title
      if (note.type === 'CHECKLIST') {
        let defaultItems = [
          { text: 'First item', order: 1 },
          { text: 'Second item', order: 2 }
        ];

        // Add specific default items based on common checklist types
        const titleLower = title.toLowerCase();
        if (titleLower.includes('pack') || titleLower.includes('holiday') || titleLower.includes('travel')) {
          defaultItems = [
            { text: 'Clothes', order: 1 },
            { text: 'Toiletries', order: 2 },
            { text: 'Phone charger', order: 3 },
            { text: 'Passport/ID', order: 4 },
            { text: 'Medications', order: 5 }
          ];
        } else if (titleLower.includes('grocery') || titleLower.includes('shopping')) {
          defaultItems = [
            { text: 'Milk', order: 1 },
            { text: 'Bread', order: 2 },
            { text: 'Eggs', order: 3 },
            { text: 'Fruits', order: 4 }
          ];
        } else if (titleLower.includes('clean') || titleLower.includes('chore')) {
          defaultItems = [
            { text: 'Vacuum living room', order: 1 },
            { text: 'Clean bathroom', order: 2 },
            { text: 'Do laundry', order: 3 },
            { text: 'Take out trash', order: 4 }
          ];
        }

        for (const item of defaultItems) {
          await prisma.checklistItem.create({
            data: {
              noteId: note.id,
              text: item.text,
              order: item.order
            }
          });
        }

        // Fetch the note again with the new checklist items
        const updatedNote = await prisma.note.findUnique({
          where: { id: note.id },
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

        return res.status(201).json(updatedNote);
      }

      return res.status(201).json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      return res.status(500).json({ error: 'Failed to create note' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}