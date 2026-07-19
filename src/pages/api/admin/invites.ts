import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/admin-helpers';
import { prisma } from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    await requireAdmin(req);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  if (req.method === 'GET') {
    try {
      const requested = Number(req.query.limit || 100);
      const limit = Number.isFinite(requested) ? Math.max(1, Math.min(Math.floor(requested), 500)) : 100;
      const invites = await prisma.invite.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          household: { select: { id: true, name: true } },
        },
      });
      return res.status(200).json({ invites });
    } catch (error) {
      console.error('Error fetching invites:', error);
      return res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }

  if (req.method === 'PATCH') {
    const { action, inviteId } = (req.body || {}) as { action?: string; inviteId?: string };
    if (!action) return res.status(400).json({ error: 'Missing action' });
    if (!inviteId) return res.status(400).json({ error: 'Missing inviteId' });

    if (action !== 'revoke' && action !== 'expire') {
      return res.status(400).json({ error: 'Unknown action' });
    }

    try {
      const status = action === 'revoke' ? 'REVOKED' : 'EXPIRED';
      const updated = await prisma.invite.updateMany({
        where: { id: inviteId, status: 'PENDING' },
        data: { status },
      });
      if (updated.count !== 1) {
        return res.status(409).json({ error: 'Invite is no longer pending' });
      }
      return res.status(200).json({ ok: true, invite: { id: inviteId, status } });
    } catch (error) {
      console.error('Error updating invite:', error);
      return res.status(500).json({ error: 'Failed to update invite' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}

export default withApiHandler(handler)
