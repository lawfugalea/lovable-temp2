import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sendInviteEmail } from '@/lib/mailer';
import { appUrl } from '@/lib/links';
import { getUserIdOr401 } from '@/lib/api-guards';
import { createInviteToken, hashInviteToken } from '@/lib/invite-tokens';
import { consumeInviteEmailAttempt } from '@/lib/rate-limiter';

type Prepared =
  | { ok: false; status: number; error: string }
  | { ok: true; email: string; householdName: string; expiresAt: Date };

function makeAcceptUrl(token: string) {
  return appUrl(`/invites/accept?token=${encodeURIComponent(token)}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ error: 'Missing invite id' });

  const rawToken = createInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const prepared = await prisma.$transaction<Prepared>(async (tx) => {
    const inviteRef = await tx.invite.findUnique({ where: { id }, select: { id: true } });
    if (!inviteRef) return { ok: false, status: 404, error: 'Invite not found' };

    await tx.$queryRaw`SELECT "id" FROM "Invite" WHERE "id" = ${id} FOR UPDATE`;
    const invite = await tx.invite.findUnique({
      where: { id },
      select: {
        email: true,
        status: true,
        expiresAt: true,
        householdId: true,
        household: { select: { name: true } },
      },
    });
    if (!invite) return { ok: false, status: 404, error: 'Invite not found' };

    await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${invite.householdId} FOR UPDATE`;
    const membership = await tx.membership.findUnique({
      where: { userId_householdId: { userId, householdId: invite.householdId } },
      select: { role: true },
    });
    if (membership?.role !== 'OWNER') {
      return { ok: false, status: 403, error: 'Owner role required' };
    }
    if (!invite.email) {
      return { ok: false, status: 400, error: 'Link-only invites cannot be emailed' };
    }
    if (invite.status !== 'PENDING') {
      return { ok: false, status: 409, error: 'Invite is no longer pending' };
    }
    if (invite.expiresAt <= new Date()) {
      await tx.invite.update({ where: { id }, data: { status: 'EXPIRED' } });
      return { ok: false, status: 409, error: 'Invite is expired' };
    }
    if (!consumeInviteEmailAttempt(userId)) {
      return { ok: false, status: 429, error: 'Too many invitation emails. Try again later.' };
    }

    await tx.invite.update({
      where: { id },
      data: { tokenHash: hashInviteToken(rawToken), expiresAt },
    });
    return {
      ok: true,
      email: invite.email,
      householdName: invite.household.name,
      expiresAt,
    };
  });

  if (!prepared.ok) {
    if (prepared.status === 429) res.setHeader('Retry-After', '3600');
    return res.status(prepared.status).json({ error: prepared.error });
  }

  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const acceptUrl = makeAcceptUrl(rawToken);
  const result = await sendInviteEmail({
    to: prepared.email,
    acceptUrl,
    inviterName: inviter?.name || inviter?.email || 'A Clankeep user',
    householdName: prepared.householdName,
  });

  if (!result.ok) {
    return res.status(502).json({
      error: result.error,
      acceptUrl,
      expiresAt: prepared.expiresAt.toISOString(),
      emailStatus: { ok: false },
    });
  }
  return res.status(200).json({
    ok: true,
    id: result.providerId,
    from: result.fromUsed,
    to: result.to,
    acceptUrl,
    expiresAt: prepared.expiresAt.toISOString(),
    emailStatus: { ok: true },
  });
}
