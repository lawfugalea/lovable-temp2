import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import type { InviteStatus, MemberRole } from '@prisma/client';
import { getUserIdOr401 } from '@/lib/api-guards';
import { detachUserFromHouseholds } from '@/lib/household-membership';
import { hashInviteToken, normalizeInviteToken } from '@/lib/invite-tokens';

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  const token = normalizeInviteToken(req.body?.token);
  if (!token) return res.status(400).json({ error: 'Missing or invalid token' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return res.status(401).json({ error: 'User not found' });
  const userEmail = user.email.toLowerCase();

  try {
    const acceptedHouseholdId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

      const inviteRef = await tx.invite.findUnique({
        where: { tokenHash: hashInviteToken(token) },
        select: { id: true },
      });
      if (!inviteRef) throw httpError(404, 'Invite not found');

      await tx.$queryRaw`SELECT "id" FROM "Invite" WHERE "id" = ${inviteRef.id} FOR UPDATE`;
      const invite = await tx.invite.findUnique({
        where: { id: inviteRef.id },
        select: {
          id: true,
          email: true,
          householdId: true,
          role: true,
          status: true,
          expiresAt: true,
        },
      });
      if (!invite) throw httpError(404, 'Invite not found');
      if (invite.status !== ('PENDING' as InviteStatus)) {
        throw httpError(409, 'Invite is no longer pending');
      }
      if (invite.email && invite.email.toLowerCase() !== userEmail) {
        throw httpError(403, 'This invite is addressed to another account');
      }
      if (invite.expiresAt.getTime() <= Date.now()) {
        throw httpError(400, 'Invite expired');
      }

      const conflictingOwner = await tx.membership.findFirst({
        where: { userId, role: 'OWNER', householdId: { not: invite.householdId } },
        select: { household: { select: { name: true } } },
      });
      if (conflictingOwner) {
        throw httpError(409, `Transfer ownership of ${conflictingOwner.household.name} before joining another household`);
      }

      const accepted = await tx.invite.updateMany({
        where: {
          id: invite.id,
          status: 'PENDING' as InviteStatus,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'ACCEPTED' as InviteStatus,
          acceptedById: userId,
          acceptedAt: new Date(),
        },
      });
      if (accepted.count !== 1) throw httpError(409, 'Invite is no longer available');

      const formerMemberships = await tx.membership.findMany({
        where: { userId, householdId: { not: invite.householdId } },
        select: { householdId: true },
      });
      await detachUserFromHouseholds(
        tx,
        userId,
        formerMemberships.map(membership => membership.householdId),
      );

      await tx.membership.upsert({
        where: { userId_householdId: { userId, householdId: invite.householdId } },
        create: {
          userId,
          householdId: invite.householdId,
          role: (invite.role ?? 'MEMBER') as MemberRole,
        },
        update: invite.role === 'OWNER' ? { role: 'OWNER' as MemberRole } : {},
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeHouseholdId: invite.householdId },
      });
      return invite.householdId;
    });

    return res.status(200).json({ success: true, householdId: acceptedHouseholdId });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    if (status === 500) console.error('Invite accept failed:', error);
    return res.status(status).json({
      error: status === 500 ? 'Failed to accept invite' : (error as Error).message,
    });
  }
}
