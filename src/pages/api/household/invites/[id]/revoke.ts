// src/pages/api/household/invites/[id]/revoke.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { InviteStatus } from '@prisma/client';

async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = sess?.user?.id as string | undefined;
  const semail = (sess?.user?.email as string | undefined)?.toLowerCase();
  if (!sid && !semail) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (sid) { const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } }); if (u) return u.id; }
  if (semail) { const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } }); if (u) return u.id; }
  res.status(401).json({ error: 'User for session not found. Please sign out and sign in again.' });
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end('Method Not Allowed'); }
  const { id } = req.query as { id: string };

  const invite = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, status: true, householdId: true },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  const userId = await resolveUserId(req, res);
  if (!userId) return;
  const membership = await prisma.membership.findFirst({
    where: { userId, householdId: invite.householdId },
    select: { role: true },
  });
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member of this household' });
  if (membership.role !== 'OWNER') return res.status(403).json({ error: 'Forbidden: owner role required' });

  if (invite.status !== 'PENDING') return res.status(400).json({ error: 'Only pending invites can be revoked' });

  await prisma.invite.update({
    where: { id },
    data: { status: ('REVOKED' as InviteStatus) },
  });

  return res.status(200).json({ ok: true });
}
