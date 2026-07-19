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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { listId } = (req.body || {}) as { listId?: string };
  if (!listId) return res.status(400).json({ error: 'Missing listId' });

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  });
  if (!list) return res.status(404).json({ error: 'List not found' });

  const isMember = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  });
  if (!isMember) return res.status(403).json({ error: 'Forbidden' });

  await prisma.shoppingItem.deleteMany({ where: { listId, status: 'DONE' } });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}

export default withApiHandler(handler)
