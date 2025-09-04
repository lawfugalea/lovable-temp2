// src/pages/api/debug/resend-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendInviteEmail } from '@/lib/resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const to = (req.query.to as string) || process.env.TEST_EMAIL || '';
  if (!to) return res.status(400).send('Provide ?to=email@example.com or set TEST_EMAIL');
  const acceptUrl = (req.query.url as string) || 'https://galeahub.online/invite/accept?token=debug';
  const result = await sendInviteEmail({
    to,
    acceptUrl,
    householdName: 'Debug Household',
    invitedByName: 'Houseflow',
  });
  return res.status(result.ok ? 200 : 500).json(result);
}
