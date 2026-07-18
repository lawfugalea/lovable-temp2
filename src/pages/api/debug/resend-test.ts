// src/pages/api/debug/resend-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendInviteEmail } from '@/lib/mailer';

import { requireDebugAccess } from '@/lib/debug-guards';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireDebugAccess(req, res))) return;
  const to = (req.query.to as string) || process.env.TEST_EMAIL || '';
  if (!to) return res.status(400).send('Provide ?to=email@example.com or set TEST_EMAIL');
  const acceptUrl = (req.query.url as string) || 'https://clankeep.com/invites/accept?token=debug';
  const result = await sendInviteEmail({
    to,
    acceptUrl,
    householdName: 'Debug Household',
    inviterName: 'Clankeep',
  });
  return res.status(result.ok ? 200 : 500).json(result);
}
