import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'PATCH') {
    const item = await requireItemAccess(userId, id);
    if (!item) return res.status(403).json({ error: 'Forbidden' });

    const patch = req.body as Partial<{
      title: string; qty: string; quantityCount: number; canonicalProductId: string | null; notes: string;
      category: string; store: string;
      status: ItemStatus;
    }>;

    const data: any = { updatedAt: new Date() };
    if (typeof patch.title === 'string') {
      const title = patch.title.trim();
      if (!title || title.length > 200) return res.status(400).json({ error: 'Invalid item title' });
      data.title = title;
    }
    if (typeof patch.qty === 'string') {
      if (patch.qty.length > 80) return res.status(400).json({ error: 'Quantity is too long' });
      data.qty = patch.qty.trim() || null;
    }
    if (patch.quantityCount !== undefined) {
      if (!Number.isInteger(patch.quantityCount) || patch.quantityCount < 1 || patch.quantityCount > 999) {
        return res.status(400).json({ error: 'Quantity count must be an integer between 1 and 999' });
      }
      data.quantityCount = patch.quantityCount;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'canonicalProductId')) {
      if (patch.canonicalProductId !== null && (typeof patch.canonicalProductId !== 'string' || !patch.canonicalProductId.trim())) {
        return res.status(400).json({ error: 'Invalid catalogue product' });
      }
      if (patch.canonicalProductId) {
        const product = await prisma.canonicalProduct.findFirst({
          where: {
            id: patch.canonicalProductId,
            products: { some: { active: true, store: { enabled: true } } },
          },
          select: { id: true },
        });
        if (!product) return res.status(409).json({ error: 'Catalogue product is no longer current; please search again' });
      }
      data.canonicalProductId = patch.canonicalProductId;
    }
    if (typeof patch.notes === 'string') {
      if (patch.notes.length > 5000) return res.status(400).json({ error: 'Notes are too long' });
      data.notes = patch.notes;
    }
    if (typeof patch.category === 'string') {
      if (patch.category.length > 100) return res.status(400).json({ error: 'Category is too long' });
      data.category = patch.category.trim() || null;
    }
    if (typeof patch.store === 'string') {
      if (patch.store.length > 100) return res.status(400).json({ error: 'Store is too long' });
      data.store = patch.store.trim() || null;
    }

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
        canonicalProduct: { select: { id: true, displayName: true, brand: true, packageValue: true, packageUnit: true, packCount: true } },
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

export default withApiHandler(handler)
