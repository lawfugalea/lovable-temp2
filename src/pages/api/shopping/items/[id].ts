import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Use a local union so we don't depend on enum import caching in editors
type ItemStatus = 'ACTIVE' | 'DONE';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

async function requireItemAccess(userId: string, itemId: string) {
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    select: { id: true, list: { select: { householdId: true } } },
  });
  if (!item) return null;
  const m = await prisma.membership.findFirst({
    where: { userId, householdId: item.list.householdId },
    select: { id: true },
  });
  return m ? item : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'PATCH') {
    const item = await requireItemAccess(userId, id);
    if (!item) return res.status(403).json({ error: 'Forbidden' });

    const patch = req.body as Partial<{
      title: string; qty: string; notes: string;
      category: string; store: string;
      status: ItemStatus;
    }>;

    const data: any = { updatedAt: new Date() };
    if (typeof patch.title === 'string') data.title = patch.title;
    if (typeof patch.qty === 'string') data.qty = patch.qty;
    if (typeof patch.notes === 'string') data.notes = patch.notes;
    if (typeof patch.category === 'string') data.category = patch.category;
    if (typeof patch.store === 'string') data.store = patch.store;

    if (patch.status === 'DONE') {
      data.status = 'DONE';
      data.doneAt = new Date();
      data.doneById = userId;
    } else if (patch.status === 'ACTIVE') {
      data.status = 'ACTIVE';
      data.doneAt = null;
      data.doneById = null;
    }

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ item: updated });
  }

  if (req.method === 'DELETE') {
    const item = await requireItemAccess(userId, id);
    if (!item) return res.status(403).json({ error: 'Forbidden' });

    await prisma.shoppingItem.delete({ where: { id } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
