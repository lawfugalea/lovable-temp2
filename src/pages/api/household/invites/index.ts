import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import type { InviteStatus, MemberRole } from '@prisma/client';
import { sendInviteEmail } from '@/lib/mailer';
import { requireMembershipIn } from '@/lib/api-guards';
import { appUrl } from '@/lib/links';
import { createInviteToken, hashInviteToken } from '@/lib/invite-tokens';
import { consumeInviteEmailAttempt } from '@/lib/rate-limiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'GET') return listInvites(req, res);
  if (req.method === 'POST') return createInvite(req, res);
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

async function listInvites(req: NextApiRequest, res: NextApiResponse) {
  const householdId = (req.query.householdId as string) || '';
  const context = await requireMembershipIn(req, res, householdId, { ownerOnly: true });
  if (!context) return;

  const now = new Date();
  await prisma.invite.updateMany({
    where: { householdId, status: 'PENDING', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
  const invites = await prisma.invite.findMany({
    where: {
      householdId,
      status: 'PENDING' as InviteStatus,
      expiresAt: { gt: now },
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

function makeAcceptUrl(token: string) {
  return appUrl(`/invites/accept?token=${encodeURIComponent(token)}`);
}

async function createInvite(req: NextApiRequest, res: NextApiResponse) {
  const { householdId, email, role } = (req.body || {}) as {
    householdId?: string;
    email?: string | null;
    role?: 'OWNER' | 'MEMBER';
  };

  const context = await requireMembershipIn(req, res, householdId, { ownerOnly: true });
  if (!context) return;

  if (!role || (role !== 'OWNER' && role !== 'MEMBER')) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  if (normalizedEmail && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const rawToken = createInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let invite;
  try {
    invite = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId!} FOR UPDATE`;
      const currentOwner = await tx.membership.findUnique({
        where: { userId_householdId: { userId: context.userId, householdId: householdId! } },
        select: { role: true },
      });
      if (currentOwner?.role !== 'OWNER') {
        throw Object.assign(new Error('Owner role required'), { status: 403 });
      }
      if (normalizedEmail) {
        await tx.invite.updateMany({
          where: { householdId, email: normalizedEmail, status: 'PENDING', expiresAt: { lte: new Date() } },
          data: { status: 'EXPIRED' },
        });
        const [member, pendingInvite] = await Promise.all([
          tx.membership.findFirst({
            where: {
              householdId,
              user: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            },
            select: { id: true },
          }),
          tx.invite.findFirst({
            where: { householdId, email: normalizedEmail, status: 'PENDING' },
            select: { id: true },
          }),
        ]);
        if (member) throw Object.assign(new Error('This user is already a household member'), { status: 409 });
        if (pendingInvite) throw Object.assign(new Error('A pending invite already exists for this email'), { status: 409 });
        if (!consumeInviteEmailAttempt(context.userId)) {
          throw Object.assign(new Error('Too many invitation emails. Try again later.'), { status: 429 });
        }
      }

      return tx.invite.create({
        data: {
          householdId: householdId!,
          email: normalizedEmail,
          role: role as MemberRole,
          status: 'PENDING' as InviteStatus,
          expiresAt,
          invitedById: context.userId,
          tokenHash: hashInviteToken(rawToken),
        },
        select: {
          id: true,
          householdId: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
        },
      });
    });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    if (status === 429) res.setHeader('Retry-After', '3600');
    return res.status(status).json({
      error: status === 500 ? 'Failed to create invite' : (error as Error).message,
    });
  }

  const acceptUrl = makeAcceptUrl(rawToken);
  let emailStatus:
    | { ok: boolean; error?: string; from?: string; to?: string; id?: string }
    | undefined;

  if (invite.email) {
    const [inviter, household] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true, email: true },
      }),
      prisma.household.findUnique({
        where: { id: householdId! },
        select: { name: true },
      }),
    ]);

    const result = await sendInviteEmail({
      to: invite.email,
      acceptUrl,
      inviterName: inviter?.name || inviter?.email || 'A HouseFlow user',
      householdName: household?.name || 'your household',
    });

    emailStatus = result.ok
      ? { ok: true, from: result.fromUsed, to: result.to, id: result.providerId }
      : { ok: false, error: result.error, from: result.fromUsed, to: result.to };
  }

  return res.status(201).json({
    id: invite.id,
    acceptUrl,
    expiresAt: invite.expiresAt.toISOString(),
    status: invite.status,
    email: invite.email,
    role: invite.role,
    ...(emailStatus ? { emailStatus } : {}),
  });
}
