import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Cheap change-detection token for one list.
 *
 * Shopping lists are the app's only genuinely concurrent surface — two people
 * in the same shop ticking items off the same list. Polling the full item
 * collection to notice a change would send the whole list every few seconds to
 * every open tab, so clients poll this instead and only refetch items when the
 * token moves.
 *
 * The token combines the row count with the newest updatedAt: the timestamp
 * alone would miss a deletion, and the count alone would miss an edit. Both
 * come from a single aggregate that the existing ShoppingItem(listId) and
 * ShoppingItem(updatedAt) indexes already serve.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as
    | { user?: { id?: string } }
    | null;
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const listId = String(req.query.listId || '');
  if (!listId) return res.status(400).json({ error: 'Missing listId' });

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  });
  if (!list) return res.status(404).json({ error: 'List not found' });

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  });
  if (!membership) return res.status(403).json({ error: 'Forbidden' });

  const aggregate = await prisma.shoppingItem.aggregate({
    where: { listId },
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    version: `${aggregate._count._all}:${aggregate._max.updatedAt?.getTime() ?? 0}`,
  });
}

export default withApiHandler(handler);
