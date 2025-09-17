import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // 1) If user has a stored active household, use it if membership still valid
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeHouseholdId: true },
    });

    if (u?.activeHouseholdId) {
      const valid = await prisma.membership.findFirst({
        where: { userId, householdId: u.activeHouseholdId },
        select: { id: true },
      });
      if (valid) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ householdId: u.activeHouseholdId });
      }
    }

    // 2) Fallback: use their only membership (SINGLE HOUSEHOLD MODEL)
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { householdId: true },
    });
    if (!membership) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'No household' });
    }

    // Persist fallback to user for next time
    await prisma.user.update({
      where: { id: userId },
      data: { activeHouseholdId: membership.householdId },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ householdId: membership.householdId });
  }

  if (req.method === 'POST') {
    const householdId = (req.body?.householdId as string | undefined) || '';
    if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

    const m = await prisma.membership.findFirst({
      where: { userId, householdId },
      select: { id: true },
    });
    if (!m) return res.status(403).json({ error: 'Forbidden: not a member' });

    await prisma.user.update({
      where: { id: userId },
      data: { activeHouseholdId: householdId },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, householdId });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
