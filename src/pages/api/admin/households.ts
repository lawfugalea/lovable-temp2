import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/admin-helpers';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  if (req.method === 'GET') {
    // Get all households with detailed info
    try {
      const households = await prisma.household.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          members: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          invites: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            }
          },
          _count: {
            select: {
              shoppingLists: true,
              children: true,
              activeForUsers: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json({ households });
    } catch (error) {
      console.error('Error fetching households:', error);
      return res.status(500).json({ error: 'Failed to fetch households' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete a household
    const { householdId } = req.body;
    
    if (!householdId) {
      return res.status(400).json({ error: 'Household ID is required' });
    }

    try {
      // Check if household exists
      const household = await prisma.household.findUnique({
        where: { id: householdId },
        select: { id: true, name: true, owner: { select: { email: true } } }
      });

      if (!household) {
        return res.status(404).json({ error: 'Household not found' });
      }

      // Prevent deleting household owned by admin
      if (household.owner && household.owner.email === 'lawfinuu@gmail.com') {
        return res.status(400).json({ error: 'Cannot delete admin household' });
      }

      // Delete household and all related data in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete shopping items in shopping lists
        await tx.shoppingItem.deleteMany({
          where: {
            list: {
              householdId: householdId
            }
          }
        });

        // Delete shopping lists
        await tx.shoppingList.deleteMany({
          where: { householdId }
        });

        // Delete children and their related data
        const children = await tx.child.findMany({
          where: { householdId },
          select: { id: true }
        });

        for (const child of children) {
          // Delete medicine doses
          await tx.medicineDose.deleteMany({
            where: { childId: child.id }
          });

          // Delete medicine reminders
          await tx.medicineReminder.deleteMany({
            where: { childId: child.id }
          });

          // Delete fever readings
          await tx.feverReading.deleteMany({
            where: { childId: child.id }
          });

          // Delete medicines
          await tx.medicine.deleteMany({
            where: { childId: child.id }
          });

          // Delete the child
          await tx.child.delete({
            where: { id: child.id }
          });
        }

        // Delete invites for this household
        await tx.invite.deleteMany({
          where: { householdId }
        });

        // Before removing memberships, null activeHouseholdId for all users currently active on this household
        await tx.user.updateMany({
          where: { activeHouseholdId: householdId },
          data: { activeHouseholdId: null }
        });

        // Delete memberships for this household
        await tx.membership.deleteMany({ where: { householdId } });

        // Delete page states for this household
        await tx.pageState.deleteMany({
          where: { householdId }
        });

        // Finally delete the household
        await tx.household.delete({ where: { id: householdId } });
      });

      return res.status(200).json({ message: 'Household deleted successfully' });
    } catch (error) {
      console.error('Error deleting household:', error);
      return res.status(500).json({ error: 'Failed to delete household' });
    }
  }

  if (req.method === 'PATCH') {
    const { action } = (req.body || {}) as { action?: string };
    if (!action) return res.status(400).json({ error: 'Missing action' });

    try {
      if (action === 'transferOwnership') {
        const { householdId, newOwnerUserId } = req.body as { householdId?: string; newOwnerUserId?: string };
        if (!householdId || !newOwnerUserId) return res.status(400).json({ error: 'Missing householdId or newOwnerUserId' });

        await prisma.$transaction(async (tx) => {
          // Ensure new owner is a member; if not, add as MEMBER
          const existing = await tx.membership.findFirst({ where: { userId: newOwnerUserId, householdId }, select: { id: true } });
          if (!existing) {
            await tx.membership.create({ data: { userId: newOwnerUserId, householdId, role: 'MEMBER' } });
          }

          // Demote current owner membership if exists
          await tx.membership.updateMany({ where: { householdId, role: 'OWNER' }, data: { role: 'MEMBER' } });

          // Promote new owner
          await tx.membership.updateMany({ where: { householdId, userId: newOwnerUserId }, data: { role: 'OWNER' } });

          // Update household ownerId
          await tx.household.update({ where: { id: householdId }, data: { ownerId: newOwnerUserId } });
        });

        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Error updating household:', error);
      return res.status(500).json({ error: 'Failed to update household' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
