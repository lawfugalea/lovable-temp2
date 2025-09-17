import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUserId(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function requireMembership(userId: string, householdId: string) {
  return prisma.membership.findFirst({
    where: { userId, householdId },
    select: { id: true, role: true },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const householdId = (req.query.householdId as string) || (req.body?.householdId as string) || '';
  const page = (req.query.page as string) || (req.body?.page as string) || '';
  if (!householdId || !page) return res.status(400).json({ error: 'householdId and page are required' });

  const membership = await requireMembership(userId, householdId);
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member of this household' });

  if (method === 'GET') {
    const ps = await prisma.pageState.findUnique({ where: { householdId_page: { householdId, page } } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ data: ps?.data ?? null, updatedAt: ps?.updatedAt ?? null });
  }

  if (method === 'POST' || method === 'PUT') {
    // Accept any JSON payload in `data`
    const data = req.body?.data;
    if (data === undefined) return res.status(400).json({ error: 'data is required' });

    const saved = await prisma.pageState.upsert({
      where: { householdId_page: { householdId, page } },
      update: { data, updatedBy: userId },
      create: { householdId, page, data, updatedBy: userId },
      select: { data: true, updatedAt: true },
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(saved);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end('Method Not Allowed');
}
