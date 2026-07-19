import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/admin-helpers';
import { isAdminEmail } from '@/lib/admin-config';
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/password-policy';
import { deleteProviderSession } from '@/lib/finance/enable-banking';

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      if (isAdminEmail(user.email)) {
        return res.status(400).json({ error: 'Cannot delete admin user' });
      }

      // Revoke external read access before the local cascade removes the
      // provider session identifiers. A provider outage must not make local
      // account deletion impossible; expired sessions are harmless here.
      const bankSessions = await prisma.bankConnection.findMany({
        where: { userId, providerSessionId: { not: null } },
        select: { providerSessionId: true },
      });
      const revocations = await Promise.allSettled(
        bankSessions
          .map(connection => connection.providerSessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId))
          .map(sessionId => deleteProviderSession(sessionId)),
      );
      for (const revocation of revocations) {
        if (revocation.status === 'rejected') {
          console.warn('Unable to revoke bank session during user deletion:', revocation.reason);
        }
      }

      // Delete the account without destroying a household that still has
      // another owner. Database cascades handle household-owned data and user
      // relations atomically; invite actor ids are scalar audit fields and need
      // explicit cleanup.
      await prisma.$transaction(async (tx) => {
        const [legacyOwned, ownerMemberships] = await Promise.all([
          tx.household.findMany({ where: { ownerId: userId }, select: { id: true } }),
          tx.membership.findMany({
            where: { userId, role: 'OWNER' },
            select: { householdId: true },
          }),
        ]);
        const ownerHouseholdIds = [...new Set([
          ...legacyOwned.map(household => household.id),
          ...ownerMemberships.map(membership => membership.householdId),
        ])];

        for (const householdId of ownerHouseholdIds) {
          await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId} FOR UPDATE`;
          const replacement = await tx.membership.findFirst({
            where: { householdId, role: 'OWNER', userId: { not: userId } },
            orderBy: { createdAt: 'asc' },
            select: { userId: true },
          });
          if (replacement) {
            await tx.household.update({
              where: { id: householdId },
              data: { ownerId: replacement.userId },
            });
          } else {
            await tx.user.updateMany({
              where: { activeHouseholdId: householdId },
              data: { activeHouseholdId: null },
            });
            await tx.household.delete({ where: { id: householdId } });
          }
        }

        // Delete invites created by user
        await tx.invite.deleteMany({
          where: { invitedById: userId }
        });

        // Update invites accepted by user to remove the reference
        await tx.invite.updateMany({
          where: { acceptedById: userId },
          data: { acceptedById: null }
        });

        await tx.user.delete({ where: { id: userId } });
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
        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
          return res.status(400).json({ error: passwordErrors.join('. ') });
        }
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

export default withApiHandler(handler)
