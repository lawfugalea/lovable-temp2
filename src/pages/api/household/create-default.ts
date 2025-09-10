// src/pages/api/household/create-default.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1) Ensure signed in
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sessionId = sess?.user?.id as string | undefined;
  const sessionEmail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sessionId && !sessionEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2) Resolve the *actual* user row (id first, then email fallback)
  //    Include activeHouseholdId so we can set a fallback if needed.
  let user = null as null | { id: string; name: string | null; email: string; activeHouseholdId: string | null };
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }
  if (!user && sessionEmail) {
    user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found for session. Please sign out and sign in again.' });
  }

  // 3) If user already belongs to any household, reuse the earliest one
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { householdId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    // If they don't have an active household set yet, set this one as active.
    if (!user.activeHouseholdId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeHouseholdId: existing.householdId },
      });
    }
    return res.status(200).json({ householdId: existing.householdId });
  }

  // 4) Otherwise create a personal household + OWNER membership (transaction)
  const defaultName =
    (user.name?.split(' ')[0] || user.email.split('@')[0] || 'My') + "'s Household";

  try {
    const household = await prisma.$transaction(async (tx) => {
      const h = await tx.household.create({
        data: { name: defaultName, ownerId: user!.id }, // Keep ownerId for backward compatibility
        select: { id: true },
      });

      await tx.membership.create({
        data: { userId: user!.id, householdId: h.id, role: 'OWNER' },
      });

      // NEW: set this newly created household as the user's active household
      await tx.user.update({
        where: { id: user!.id },
        data: { activeHouseholdId: h.id },
      });

      return h;
    });

    return res.status(200).json({ householdId: household.id });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to create default household', detail: e?.message || String(e) });
  }
}
