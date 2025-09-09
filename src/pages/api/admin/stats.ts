import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/admin-helpers';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get basic stats
    const [
      totalUsers,
      totalHouseholds,
      totalShoppingLists,
      totalShoppingItems,
      totalInvites,
      totalChildren,
      totalMedicines,
      totalFeverReadings,
      recentUsers,
      activeHouseholds,
      shoppingStats,
      medicineStats
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.household.count(),
      prisma.shoppingList.count(),
      prisma.shoppingItem.count(),
      prisma.invite.count(),
      prisma.child.count(),
      prisma.medicine.count(),
      prisma.feverReading.count(),

      // Recent users (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Active households (with members)
      prisma.household.count({
        where: {
          members: {
            some: {}
          }
        }
      }),

      // Shopping stats
      prisma.shoppingItem.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      }),

      // Medicine stats
      prisma.medicine.groupBy({
        by: ['isActive'],
        _count: {
          isActive: true
        }
      })
    ]);

    // Get user growth over time (last 30 days)
    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get household size distribution
    const householdSizes = await prisma.household.findMany({
      select: {
        id: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    const sizeDistribution = householdSizes.reduce((acc, household) => {
      const size = household._count.members;
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Get top households by activity (shopping items created)
    const topHouseholds = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            shoppingLists: true,
            children: true
          }
        }
      },
      orderBy: {
        shoppingLists: {
          _count: 'desc'
        }
      },
      take: 10
    });

    const stats = {
      overview: {
        totalUsers,
        totalHouseholds,
        totalShoppingLists,
        totalShoppingItems,
        totalInvites,
        totalChildren,
        totalMedicines,
        totalFeverReadings,
        recentUsers,
        activeHouseholds
      },
      shopping: {
        activeItems: shoppingStats.find(s => s.status === 'ACTIVE')?._count.status || 0,
        completedItems: shoppingStats.find(s => s.status === 'DONE')?._count.status || 0
      },
      medicine: {
        activeMedicines: medicineStats.find(m => m.isActive === true)?._count.isActive || 0,
        inactiveMedicines: medicineStats.find(m => m.isActive === false)?._count.isActive || 0
      },
      growth: {
        userGrowth: userGrowth.map(day => ({
          date: day.createdAt.toISOString().split('T')[0],
          count: day._count.id
        }))
      },
      distribution: {
        householdSizes: sizeDistribution
      },
      topHouseholds
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
