import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { apiRateLimit } from '@/lib/rate-limiter';
import { hashInviteToken, normalizeInviteToken } from '@/lib/invite-tokens';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
  if (!(await apiRateLimit(req, res))) return;

  const token = normalizeInviteToken(req.query.token);
  if (!token) return res.status(400).json({ error: 'Missing or invalid token' });

  try {
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      select: {
        status: true,
        expiresAt: true,
        household: {
          select: {
            name: true,
            owner: { select: { name: true } },
          },
        },
      },
    });

    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invite already used or not pending' });
    }
    if (invite.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Invite expired' });
    }

    return res.status(200).json({
      valid: true,
      householdName: invite.household.name,
      inviterName: invite.household.owner?.name || 'Household Member',
    });
  } catch (error) {
    console.error('Invite validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiHandler(handler)
