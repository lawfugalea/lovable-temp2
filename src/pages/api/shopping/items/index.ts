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

async function requireListAccess(userId: string, listId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  });
  if (!list) return null;

  const m = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  });
  return m ? list : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const listId = String(req.query.listId || '');
    if (!listId) return res.status(400).json({ error: 'Missing listId' });

    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });

    const items = await prisma.shoppingItem.findMany({
      where: { listId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { listId, title, qty, price, imageUrl, productUrl, store } = (req.body || {}) as {
      listId?: string;
      title?: string;
      qty?: string | number;
      price?: number;
      imageUrl?: string;
      productUrl?: string;
      store?: string;
    };
    if (!listId || !title) return res.status(400).json({ error: 'Missing listId or title' });

    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });

    // Store additional product info in notes as JSON
    const productInfo = {
      price: price || null,
      imageUrl: imageUrl || null,
      productUrl: productUrl || null,
      originalStore: store || null,
    };

    const item = await prisma.shoppingItem.create({
      data: {
        listId,
        title: title.trim(),
        qty: qty ? String(qty).trim() : undefined,
        store: store || undefined,
        notes: Object.values(productInfo).some(v => v !== null) ? JSON.stringify(productInfo) : undefined,
        createdById: userId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
