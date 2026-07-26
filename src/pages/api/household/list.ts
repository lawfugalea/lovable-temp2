import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';

/**
 * Every household this user belongs to, for the household switcher.
 *
 * Users could only ever be in one household before
 * 20260726120000_multi_household_membership, so the switcher had nothing to
 * switch between and this route did not exist.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  res.setHeader('Cache-Control', 'private, no-store');

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { activeHouseholdId: true } }),
    prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        createdAt: true,
        household: {
          select: {
            id: true,
            name: true,
            country: true,
            _count: { select: { members: true } },
          },
        },
      },
    }),
  ]);

  return res.status(200).json({
    activeHouseholdId: user?.activeHouseholdId ?? null,
    households: memberships.map((membership) => ({
      id: membership.household.id,
      name: membership.household.name,
      country: membership.household.country,
      role: membership.role,
      memberCount: membership.household._count.members,
      joinedAt: membership.createdAt,
    })),
  });
}

export default withApiHandler(handler);
