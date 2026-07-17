import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const actorId = await getUserIdOr401(req, res);
  if (!actorId) return;
  const memberId = typeof req.query.id === 'string' ? req.query.id : '';
  const role = req.body?.role;
  if (!memberId) return res.status(400).json({ error: 'Missing member id' });
  if (role !== 'OWNER' && role !== 'MEMBER') {
    return res.status(400).json({ error: 'Role must be OWNER or MEMBER' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const target = await tx.membership.findUnique({
        where: { id: memberId },
        select: { id: true, userId: true, householdId: true, role: true },
      });
      if (!target) throw Object.assign(new Error('Membership not found'), { status: 404 });

      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${target.householdId} FOR UPDATE`;
      const actor = await tx.membership.findUnique({
        where: { userId_householdId: { userId: actorId, householdId: target.householdId } },
        select: { role: true },
      });
      if (actor?.role !== 'OWNER') throw Object.assign(new Error('Owner role required'), { status: 403 });

      if (target.role === 'OWNER' && role === 'MEMBER') {
        const replacement = await tx.membership.findFirst({
          where: { householdId: target.householdId, role: 'OWNER', id: { not: target.id } },
          orderBy: { createdAt: 'asc' },
          select: { userId: true },
        });
        if (!replacement) {
          throw Object.assign(new Error('Promote another member before demoting the final owner'), { status: 409 });
        }
        await tx.household.updateMany({
          where: { id: target.householdId, ownerId: target.userId },
          data: { ownerId: replacement.userId },
        });
      }

      const membership = target.role === role
        ? target
        : await tx.membership.update({
            where: { id: target.id },
            data: { role },
            select: { id: true, userId: true, householdId: true, role: true },
          });
      if (role === 'OWNER') {
        await tx.household.updateMany({
          where: { id: target.householdId, ownerId: null },
          data: { ownerId: target.userId },
        });
      }
      return membership;
    });
    return res.status(200).json({ membership: updated });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    return res.status(status).json({ error: status === 500 ? 'Failed to update member role' : (error as Error).message });
  }
}
