import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        activeHouseholdId: true,
        _count: {
          select: {
            ownedHouseholds: true,
            memberships: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform the data to match our interface
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      activeHouseholdId: user.activeHouseholdId,
      ownedHouseholds: user._count.ownedHouseholds,
      memberships: user._count.memberships
    }));

    return res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
