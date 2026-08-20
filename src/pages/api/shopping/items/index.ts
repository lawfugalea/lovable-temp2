import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withBasePath } from '@/lib/base-path';
import { recordActivity } from '@/lib/activity';

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

function safeHttpUrl(value: unknown, allowLocalProxy = false): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (allowLocalProxy && (
    value.startsWith('/api/image-proxy?url=')
    || value.startsWith(withBasePath('/api/image-proxy?url='))
  )) return value;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        canonicalProduct: { select: { id: true, displayName: true, brand: true, packageValue: true, packageUnit: true, packCount: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { listId, title, qty, quantityCount, canonicalProductId, price, imageUrl, productUrl, store } = (req.body || {}) as {
      listId?: string;
      title?: string;
      qty?: string | number;
      quantityCount?: number;
      canonicalProductId?: string;
      price?: number;
      imageUrl?: string;
      productUrl?: string;
      store?: string;
    };
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedQty = qty === undefined || qty === null ? '' : String(qty).trim();
    const normalizedStore = typeof store === 'string' ? store.trim() : '';
    const normalizedImageUrl = safeHttpUrl(imageUrl, true);
    const normalizedProductUrl = safeHttpUrl(productUrl);
    if (!listId || !normalizedTitle || normalizedTitle.length > 200 || normalizedQty.length > 80 || normalizedStore.length > 100) {
      return res.status(400).json({ error: 'Invalid list item details' });
    }
    if ((imageUrl && !normalizedImageUrl) || (productUrl && !normalizedProductUrl)) {
      return res.status(400).json({ error: 'Product links must use HTTP or HTTPS' });
    }
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    const normalizedQuantityCount = quantityCount ?? 1;
    if (!Number.isInteger(normalizedQuantityCount) || normalizedQuantityCount < 1 || normalizedQuantityCount > 999) {
      return res.status(400).json({ error: 'Quantity count must be an integer between 1 and 999' });
    }
    if (canonicalProductId !== undefined && (typeof canonicalProductId !== 'string' || !canonicalProductId.trim())) {
      return res.status(400).json({ error: 'Invalid catalogue product' });
    }

    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });
    if (canonicalProductId) {
      const product = await prisma.canonicalProduct.findFirst({
        where: {
          id: canonicalProductId,
          products: { some: { active: true, store: { enabled: true } } },
        },
        select: { id: true },
      });
      if (!product) return res.status(409).json({ error: 'Catalogue product is no longer current; please search again' });
    }

    // Store additional product info in notes as JSON
    const productInfo = {
      price: price ?? null,
      imageUrl: normalizedImageUrl,
      productUrl: normalizedProductUrl,
      originalStore: normalizedStore || null,
    };

    const item = await prisma.shoppingItem.create({
      data: {
        listId,
        title: normalizedTitle,
        qty: normalizedQty || undefined,
        quantityCount: normalizedQuantityCount,
        canonicalProductId: canonicalProductId || undefined,
        store: normalizedStore || undefined,
        notes: Object.values(productInfo).some(v => v !== null) ? JSON.stringify(productInfo) : undefined,
        createdById: userId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
        canonicalProduct: { select: { id: true, displayName: true, brand: true, packageValue: true, packageUnit: true, packCount: true } },
      },
    });

    void recordActivity({
      householdId: list.householdId,
      userId,
      module: 'shopping',
      action: 'item-added',
      summary: `${item.createdBy?.name || 'Someone'} added ${normalizedTitle} to the shopping list`,
      targetId: item.id,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

export default withApiHandler(handler)
