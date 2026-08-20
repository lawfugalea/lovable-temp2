import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';
import { rejectDemoUser } from '@/lib/demo';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, weeklyDigestOptOut: true },
    });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    return res.status(200).json({ user });
  }

  if (await rejectDemoUser(res, userId, 'Editing the profile')) return;

  const data: { name?: string; weeklyDigestOptOut?: boolean } = {};

  if (req.body?.name !== undefined) {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
    }
    data.name = name;
  }

  if (req.body?.weeklyDigestOptOut !== undefined) {
    if (typeof req.body.weeklyDigestOptOut !== 'boolean') {
      return res.status(400).json({ error: 'weeklyDigestOptOut must be a boolean' });
    }
    data.weeklyDigestOptOut = req.body.weeklyDigestOptOut;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, weeklyDigestOptOut: true },
  });
  return res.status(200).json({ user });
}

export default withApiHandler(handler)
