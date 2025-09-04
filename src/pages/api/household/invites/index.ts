// src/pages/api/household/invites/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { InviteStatus, MemberRole } from '@prisma/client';
import { sendInviteEmail } from '@/lib/mailer';

// --- helpers (resolve user; enforce membership/owner) ---
async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = sess?.user?.id as string | undefined;
  const semail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sid && !semail) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (sid) {
    const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } });
    if (u) return u.id;
  }
  if (semail) {
    const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } });
    if (u) return u.id;
  }

  res.status(401).json({ error: 'User for session not found. Please sign out and sign in again.' });
  return null;
}

async function requireMembershipIn(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  { ownerOnly = false }: { ownerOnly?: boolean } = {}
): Promise<{ userId: string } | null> {
  if (!householdId) {
    res.status(400).json({ error: 'Missing householdId' });
    return null;
  }
  const userId = await resolveUserId(req, res);
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
// -----------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return listInvites(req, res);
  if (req.method === 'POST') return createInvite(req, res);
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

async function listInvites(req: NextApiRequest, res: NextApiResponse) {
  const householdId = (req.query.householdId as string) || '';
  const ctx = await requireMembershipIn(req, res, householdId, { ownerOnly: false });
  if (!ctx) return;

  const invites = await prisma.invite.findMany({
    where: {
      householdId,
      status: 'PENDING' as InviteStatus,
      // NEW: hide invites that are already expired by time
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
    select: {
      id: true,
      householdId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  return res.status(200).json({ invites });
}

function makeAcceptUrl(req: NextApiRequest, token: string) {
  // Prefer env base to align link domain with sender domain
  const base = (process.env.INVITES_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/invites/accept?token=${encodeURIComponent(token)}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['host'] as string) || 'localhost:3000';
  return `${proto}://${host}/invites/accept?token=${encodeURIComponent(token)}`;
}

async function createInvite(req: NextApiRequest, res: NextApiResponse) {
  const { householdId, email, role } = (req.body || {}) as {
    householdId?: string;
    email?: string | null;
    role?: 'OWNER' | 'MEMBER';
  };

  const ctx = await requireMembershipIn(req, res, householdId, { ownerOnly: true });
  if (!ctx) return;

  if (!role || (role !== 'OWNER' && role !== 'MEMBER')) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const token = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      householdId: householdId!,
      email: email ? String(email).toLowerCase() : null,
      role: role as MemberRole,
      status: 'PENDING' as InviteStatus,
      expiresAt,
      invitedById: ctx.userId,
      token,
    },
    select: {
      id: true,
      token: true,
      householdId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  let emailStatus:
    | { ok: boolean; error?: string; from?: string; to?: string; id?: string }
    | undefined = undefined;

  if (invite.email) {
    const inviter = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    });
    const household = await prisma.household.findUnique({
      where: { id: householdId! },
      select: { name: true },
    });

    const acceptUrl = makeAcceptUrl(req, invite.token);
    const r = await sendInviteEmail({
      to: invite.email,
      acceptUrl,
      inviterName: inviter?.name || inviter?.email || 'A Houseflow user',
      householdName: household?.name || 'your household',
    });

    emailStatus = r.ok
      ? { ok: true, from: r.fromUsed, to: r.to, id: r.providerId }
      : { ok: false, error: r.error, from: r.fromUsed, to: r.to };
  }

  return res.status(200).json({
    id: invite.id,
    acceptUrl: makeAcceptUrl(req, invite.token),
    expiresAt: invite.expiresAt.toISOString(),
    status: invite.status,
    email: invite.email,
    role: invite.role,
    ...(emailStatus ? { emailStatus } : {}),
  });
}
