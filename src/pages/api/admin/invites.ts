import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/admin-helpers';
import { prisma } from '@/lib/prisma';
import type { InviteStatus } from '@prisma/client';

function makeAcceptUrl(req: NextApiRequest, token: string) {
  const base = (process.env.INVITES_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/invites/accept?token=${encodeURIComponent(token)}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['host'] as string) || 'localhost:3000';
  return `${proto}://${host}/invites/accept?token=${encodeURIComponent(token)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  if (req.method === 'GET') {
    try {
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const invites = await prisma.invite.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          token: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          household: { select: { id: true, name: true } },
        }
      });
      return res.status(200).json({ invites });
    } catch (error) {
      console.error('Error fetching invites:', error);
      return res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }

  if (req.method === 'PATCH') {
    const { action } = (req.body || {}) as { action?: string };
    if (!action) return res.status(400).json({ error: 'Missing action' });

    try {
      if (action === 'revoke') {
        const { inviteId } = req.body as { inviteId?: string };
        if (!inviteId) return res.status(400).json({ error: 'Missing inviteId' });
        const updated = await prisma.invite.update({
          where: { id: inviteId },
          data: { status: 'REVOKED' as InviteStatus },
          select: { id: true, status: true }
        });
        return res.status(200).json({ ok: true, invite: updated });
      }

      if (action === 'expire') {
        const { inviteId } = req.body as { inviteId?: string };
        if (!inviteId) return res.status(400).json({ error: 'Missing inviteId' });
        const updated = await prisma.invite.update({
          where: { id: inviteId },
          data: { status: 'EXPIRED' as InviteStatus },
          select: { id: true, status: true }
        });
        return res.status(200).json({ ok: true, invite: updated });
      }

      if (action === 'acceptLink') {
        const { token } = req.body as { token?: string };
        if (!token) return res.status(400).json({ error: 'Missing token' });
        return res.status(200).json({ ok: true, acceptUrl: makeAcceptUrl(req, token) });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Error updating invite:', error);
      return res.status(500).json({ error: 'Failed to update invite' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}


