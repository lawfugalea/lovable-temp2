// src/lib/api-guard.ts
// Enforce per-household membership (and optional owner-only) inside API routes.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]'; // relative
import { prisma } from './prisma'; // relative

type AppSessionUser = { id?: string; email?: string | null; name?: string | null };
type AppSession = { user?: AppSessionUser | null };

/** Get userId from session or send 401 and return null */
export async function getUserIdOr401(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as AppSession | null;
  const uid = sess?.user?.id;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return uid;
}

/** Ensure the logged-in user is a member of the given household. Optionally require OWNER. */
export async function requireMembershipIn(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  { ownerOnly = false }: { ownerOnly?: boolean } = {}
): Promise<{ userId: string } | null> {
  if (!householdId) {
    res.status(400).json({ error: 'Missing householdId' });
    return null;
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: 'Forbidden: not a member of this household' });
    return null;
  }
  if (ownerOnly && membership.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden: owner role required' });
    return null;
  }

  return { userId };
}
