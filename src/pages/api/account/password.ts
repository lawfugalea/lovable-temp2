import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';
import { validatePassword } from '@/lib/password-policy';
import { clearLoginAttempts, consumeLoginAttempt } from '@/lib/rate-limiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  const attemptKey = `password-change:${userId}`;
  if (!consumeLoginAttempt(attemptKey)) {
    return res.status(429).json({ error: 'Too many password attempts. Try again later.' });
  }

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const errors = validatePassword(newPassword);
  if (!currentPassword || currentPassword.length > 128 || errors.length) {
    return res.status(400).json({ error: errors[0] || 'Current password is required', details: errors });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (await bcrypt.compare(newPassword, user.password)) {
    return res.status(400).json({ error: 'New password must be different' });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });
  clearLoginAttempts(attemptKey);
  return res.status(200).json({ ok: true });
}
