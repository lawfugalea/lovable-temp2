// /src/pages/api/shopping/lists/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  // Find active household for this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  });

  const householdId = user?.activeHouseholdId;
  if (!householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'No active household selected' });
  }

  if (req.method === 'GET') {
    const lists = await prisma.shoppingList.findMany({
      where: { householdId },
      orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }],
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ lists });
  }

  if (req.method === 'POST') {
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'Name is required' });
    }
    try {
      const list = await prisma.shoppingList.create({
        data: { householdId, name: name.trim() },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ list });
    } catch (e: any) {
      if (e.code === 'P2002') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(409).json({ error: 'List name already exists' });
      }
      throw e;
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
