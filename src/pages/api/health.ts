import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getReminderStatus } from '@/lib/reminder-heartbeat';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    // Reminders being stale does not make the app "down" (still 200), but the
    // field lets an uptime monitor alert on a silently-dead reminder pipeline.
    return res.status(200).json({ ok: true, reminders: getReminderStatus() });
  } catch {
    return res.status(503).json({ ok: false });
  }
}

export default withApiHandler(handler)
