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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  });
  if (!user?.activeHouseholdId) return null;
  const membership = await prisma.membership.findUnique({
    where: {
      userId_householdId: { userId, householdId: user.activeHouseholdId },
    },
    select: { householdId: true },
  });
  return membership?.householdId ?? null;
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
        productId?: string;
        note?: string;
      }>;
    };

    if (!name?.trim() || name.trim().length > 100 || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing name or items' });
    }
    if (items.length > 200 || items.some(item => {
      const quantity = item.quantity ?? 1;
      return !item?.name?.trim()
        || item.name.trim().length > 200
        || !Number.isFinite(quantity)
        || quantity <= 0
        || quantity > 10000
        || (item.productId !== undefined && (typeof item.productId !== 'string' || !item.productId.trim()))
        || (item.note?.length || 0) > 1000;
    })) {
      return res.status(400).json({ error: 'Template contains invalid items' });
    }
    const productIds = Array.from(new Set(items.map(item => item.productId).filter((id): id is string => Boolean(id))));
    if (productIds.length) {
      const existingProducts = await prisma.canonicalProduct.count({
        where: {
          id: { in: productIds },
          products: { some: { active: true, store: { enabled: true } } },
        },
      });
      if (existingProducts !== productIds.length) {
        return res.status(409).json({ error: 'A catalogue product is no longer current; please refresh the list' });
      }
    }

    const template = await prisma.shoppingTemplate.create({
      data: {
        householdId,
        name: name.trim(),
        items: {
          create: items.map(item => ({
            name: item.name.trim(),
            quantity: item.quantity ?? 1,
            productId: item.productId || undefined,
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
