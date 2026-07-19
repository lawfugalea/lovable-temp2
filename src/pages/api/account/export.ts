import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';
import { rejectDemoUser } from '@/lib/demo';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  if (await rejectDemoUser(res, userId, 'Exporting data')) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      activeHouseholdId: true,
      bankConnections: {
        select: {
          id: true,
          provider: true,
          aspspName: true,
          aspspCountry: true,
          psuType: true,
          status: true,
          consentExpiresAt: true,
          lastSyncedAt: true,
          createdAt: true,
          updatedAt: true,
          accounts: {
            include: {
              balances: true,
              transactions: true,
              shares: { select: { householdId: true, createdAt: true } },
            },
          },
        },
      },
      memberships: {
        select: {
          role: true,
          createdAt: true,
          household: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
              shoppingLists: { include: { items: true } },
              shoppingTemplates: { include: { items: true } },
              children: {
                include: {
                  medicines: { include: { doses: true, reminders: true } },
                  feverReadings: true,
                  healthEpisodes: true,
                  weightMeasurements: true,
                },
              },
              pageStates: true,
            },
          },
        },
      },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const householdIds = user.memberships.map(membership => membership.household.id);
  const notes = await prisma.note.findMany({
    where: {
      OR: [
        { createdById: userId },
        { isShared: true, householdId: { in: householdIds } },
        { collaborators: { some: { userId } } },
      ],
    },
    include: {
      collaborators: { select: { userId: true, role: true, addedAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="clankeep-export-${stamp}.json"`);
  return res.status(200).json({ exportedAt: new Date().toISOString(), user, notes });
}

export default withApiHandler(handler)
