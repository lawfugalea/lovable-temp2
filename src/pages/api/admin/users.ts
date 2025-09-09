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
    // Get all users with basic info
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          activeHouseholdId: true,
          ownedHouseholds: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            }
          },
          memberships: {
            select: {
              id: true,
              role: true,
              household: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          _count: {
            select: {
              shoppingItemsCreated: true,
              shoppingItemsCompleted: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete a user
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      // First, get the user to check if they exist
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deleting the admin user
      if (user.email === 'lawfinuu@gmail.com') {
        return res.status(400).json({ error: 'Cannot delete admin user' });
      }

      // Delete user and all related data in a transaction
      await prisma.$transaction(async (tx) => {
        // First, get all households owned by this user
        const ownedHouseholds = await tx.household.findMany({
          where: { ownerId: userId },
          select: { id: true }
        });

        // For each owned household, delete all related data
        for (const household of ownedHouseholds) {
          // Delete shopping items in shopping lists
          await tx.shoppingItem.deleteMany({
            where: {
              list: {
                householdId: household.id
              }
            }
          });

          // Delete shopping lists
          await tx.shoppingList.deleteMany({
            where: { householdId: household.id }
          });

          // Delete children and their related data
          const children = await tx.child.findMany({
            where: { householdId: household.id },
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
          await tx.invite.deleteMany({ where: { householdId: household.id } });

          // Before removing memberships, null activeHouseholdId for all users currently active on this household
          await tx.user.updateMany({
            where: { activeHouseholdId: household.id },
            data: { activeHouseholdId: null }
          });

          // Delete memberships for this household
          await tx.membership.deleteMany({ where: { householdId: household.id } });

          // Delete page states for this household
          await tx.pageState.deleteMany({
            where: { householdId: household.id }
          });

          // Finally delete the household
          await tx.household.delete({ where: { id: household.id } });
        }

        // Delete shopping items created by user (in other households)
        await tx.shoppingItem.deleteMany({
          where: { createdById: userId }
        });

        // Update shopping items completed by user to remove the reference
        await tx.shoppingItem.updateMany({
          where: { doneById: userId },
          data: { doneById: null }
        });

        // Delete memberships where user is a member
        await tx.membership.deleteMany({ where: { userId } });

        // Ensure user's own activeHouseholdId is cleared
        await tx.user.update({ where: { id: userId }, data: { activeHouseholdId: null } });

        // Delete invites created by user
        await tx.invite.deleteMany({
          where: { invitedById: userId }
        });

        // Update invites accepted by user to remove the reference
        await tx.invite.updateMany({
          where: { acceptedById: userId },
          data: { acceptedById: null }
        });

        // Finally, delete the user
        await tx.user.delete({
          where: { id: userId }
        });
      });

      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  if (req.method === 'PATCH') {
    const { action } = (req.body || {}) as { action?: string };
    if (!action) return res.status(400).json({ error: 'Missing action' });

    try {
      if (action === 'reconcile') {
        const { userId } = req.body as { userId?: string };
        if (!userId) return res.status(400).json({ error: 'Missing userId' });
        // Soft reconcile: if user has a membership, set active to first one, else null
        const membership = await prisma.membership.findFirst({ where: { userId }, select: { householdId: true }, orderBy: { createdAt: 'asc' } });
        const activeHouseholdId = membership?.householdId ?? null;
        await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId } });
        return res.status(200).json({ ok: true, activeHouseholdId });
      }

      if (action === 'setActiveHousehold') {
        const { userId, householdId } = req.body as { userId?: string; householdId?: string | null };
        if (!userId) return res.status(400).json({ error: 'Missing userId' });
        if (householdId) {
          // ensure membership
          const membership = await prisma.membership.findFirst({ where: { userId, householdId }, select: { id: true } });
          if (!membership) return res.status(400).json({ error: 'User is not a member of that household' });
        }
        await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: householdId ?? null } });
        return res.status(200).json({ ok: true });
      }

      if (action === 'resetPassword') {
        const { userId, newPassword } = req.body as { userId?: string; newPassword?: string };
        if (!userId || !newPassword) return res.status(400).json({ error: 'Missing userId or newPassword' });
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: userId }, data: { password: hash } });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
