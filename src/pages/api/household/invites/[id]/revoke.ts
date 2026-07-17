import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';

type Result = { ok: true } | { ok: false; status: number; error: string };

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

  const result = await prisma.$transaction<Result>(async (tx) => {
    const inviteRef = await tx.invite.findUnique({ where: { id }, select: { id: true } });
    if (!inviteRef) return { ok: false, status: 404, error: 'Invite not found' };

    await tx.$queryRaw`SELECT "id" FROM "Invite" WHERE "id" = ${id} FOR UPDATE`;
    const invite = await tx.invite.findUnique({
      where: { id },
      select: { id: true, status: true, expiresAt: true, householdId: true },
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
    if (invite.status !== 'PENDING') {
      return { ok: false, status: 409, error: 'Invite is no longer pending' };
    }
    if (invite.expiresAt <= new Date()) {
      await tx.invite.update({ where: { id }, data: { status: 'EXPIRED' } });
      return { ok: false, status: 409, error: 'Invite is expired' };
    }

    const revoked = await tx.invite.updateMany({
      where: { id, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: { status: 'REVOKED' },
    });
    return revoked.count === 1
      ? { ok: true }
      : { ok: false, status: 409, error: 'Invite is no longer pending' };
  });

  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.status(200).json({ ok: true });
}
