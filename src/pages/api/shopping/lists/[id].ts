// /src/pages/api/shopping/lists/[id].ts
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = req.query.id as string;
  if (!id) { res.status(400).json({ error: 'Missing id' }); return; }

  // Verify the list belongs to the user's active household
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  });
  const householdId = user?.activeHouseholdId;
  if (!householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'No active household selected' });
  }

  const list = await prisma.shoppingList.findUnique({ where: { id } });
  if (!list || list.householdId !== householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'List not found' });
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId, householdId } },
    select: { id: true },
  });
  if (!membership) return res.status(403).json({ error: 'Active household is no longer available' });

  if (req.method === 'PATCH') {
    const { name, archive, unarchive } = req.body as {
      name?: string; archive?: boolean; unarchive?: boolean;
    };

    const data: any = {};
    if (typeof name === 'string') {
      if (!name.trim() || name.trim().length > 100) {
        return res.status(400).json({ error: 'A list name of 100 characters or fewer is required' });
      }
      data.name = name.trim();
    }
    if (archive) data.archivedAt = new Date();
    if (unarchive) data.archivedAt = null;

    const updated = await prisma.shoppingList.update({ where: { id }, data });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ list: updated });
  }

  if (req.method === 'DELETE') {
    const force = (req.query.force as string | undefined) === 'true';
    const itemCount = await prisma.shoppingItem.count({ where: { listId: id } });
    if (itemCount > 0 && !force) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'List not empty. Use ?force=true to delete.' });
    }
    await prisma.$transaction(async (tx) => {
      if (force) await tx.shoppingItem.deleteMany({ where: { listId: id } });
      await tx.shoppingList.delete({ where: { id } });
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

export default withApiHandler(handler)
