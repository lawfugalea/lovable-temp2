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

async function requireHouseholdAccess(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { householdId: true },
  });
  return membership?.householdId || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const householdId = await requireHouseholdAccess(userId);
  if (!householdId) return res.status(403).json({ error: 'No household access' });

  if (req.method === 'GET') {
    const templates = await prisma.shoppingTemplate.findMany({
      where: { householdId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ templates });
  }

  if (req.method === 'POST') {
    const { name, items } = req.body as {
      name: string;
      items: Array<{
        name: string;
        quantity?: number;
        note?: string;
      }>;
    };

    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing name or items' });
    }

    const template = await prisma.shoppingTemplate.create({
      data: {
        householdId,
        name: name.trim(),
        items: {
          create: items.map(item => ({
            name: item.name.trim(),
            quantity: item.quantity || 1,
            note: item.note?.trim() || undefined,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ template });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
