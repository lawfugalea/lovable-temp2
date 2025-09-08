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

    const households = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform the data to match our interface
    const transformedHouseholds = households.map(household => ({
      id: household.id,
      name: household.name,
      ownerId: household.ownerId,
      createdAt: household.createdAt.toISOString(),
      memberCount: household._count.members,
      owner: household.owner
    }));

    return res.status(200).json({ households: transformedHouseholds });
  } catch (error) {
    console.error('Admin households error:', error);
    return res.status(500).json({ error: 'Failed to fetch households' });
  }
}
