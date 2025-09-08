import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Admin check with the correct email
function isAdmin(session: any): boolean {
  const adminEmails = [
    'lawfinuu@gmail.com'
  ];
  return adminEmails.includes(session?.user?.email);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !isAdmin(session)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get today's date for new users calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all stats in parallel
    const [
      totalUsers,
      totalHouseholds,
      activeUsers,
      newUsersToday,
      totalInvites,
      pendingInvites,
      totalShoppingItems,
      totalMedicines
    ] = await Promise.all([
      prisma.user.count(),
      prisma.household.count(),
      prisma.user.count({
        where: {
          activeHouseholdId: { not: null }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: today }
        }
      }),
      prisma.invite.count(),
      prisma.invite.count({
        where: { status: 'PENDING' }
      }),
      prisma.shoppingItem.count(),
      prisma.medicine.count()
    ]);

    const stats = {
      totalUsers,
      totalHouseholds,
      activeUsers,
      newUsersToday,
      totalInvites,
      pendingInvites,
      totalShoppingItems,
      totalMedicines
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
