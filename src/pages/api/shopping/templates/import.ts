import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method === 'POST') {
    const { listId, templateId, selectedItems } = req.body as {
      listId: string;
      templateId: string;
      selectedItems?: string[]; // Array of template item IDs to import
    };

    if (!listId || !templateId) {
      return res.status(400).json({ error: 'Missing listId or templateId' });
    }
    if (selectedItems && (!Array.isArray(selectedItems) || selectedItems.length > 200 || selectedItems.some(id => typeof id !== 'string'))) {
      return res.status(400).json({ error: 'Invalid selected items' });
    }

    // Check list access
    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });

    const template = await prisma.shoppingTemplate.findFirst({
      where: { id: templateId, householdId: list.householdId },
      select: { id: true },
    });
    if (!template) return res.status(404).json({ error: 'Template not found in this household' });

    // Get template items
    const templateItems = await prisma.shoppingTemplateItem.findMany({
      where: {
        templateId,
        ...(selectedItems && selectedItems.length > 0 ? { id: { in: selectedItems } } : {}),
      },
      include: {
        product: {
          select: {
            products: {
              where: { active: true, store: { enabled: true } },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    if (templateItems.length === 0) {
      return res.status(400).json({ error: 'No items found to import' });
    }

    // Create shopping items
    const createdItems = await prisma.$transaction(
      templateItems.map(item =>
        prisma.shoppingItem.create({
          data: {
            listId,
            title: item.name,
            qty: item.quantity.toString(),
            quantityCount: Math.max(1, Math.min(999, Math.trunc(Number(item.quantity)))),
            canonicalProductId: item.productId && item.product?.products.length ? item.productId : undefined,
            notes: item.note || undefined,
            createdById: userId,
            status: 'ACTIVE',
          },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            doneBy: { select: { id: true, name: true, email: true } },
            canonicalProduct: { select: { id: true, displayName: true, brand: true, packageValue: true, packageUnit: true, packCount: true } },
          },
        })
      )
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items: createdItems });
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end('Method Not Allowed');
}

export default withApiHandler(handler)
