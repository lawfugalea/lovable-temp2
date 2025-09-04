import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end('Method Not Allowed'); }
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const householdId = (req.query.householdId as string) || '';
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

  // Must be a member to view; owners get role info for everyone
  const viewer = await prisma.membership.findFirst({ where: { userId, householdId }, select: { role: true } });
  if (!viewer) return res.status(403).json({ error: 'Forbidden' });

  const members = await prisma.membership.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  return res.status(200).json({ viewerRole: viewer.role, members });
}
