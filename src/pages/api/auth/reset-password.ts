import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma'
import { invalidateSessionUser } from '@/lib/session-user-cache';
import { createRateLimit } from '@/lib/rate-limiter';
import { clearLoginAttempts } from '@/lib/rate-limit-store';
import { hashInviteToken, normalizeInviteToken } from '@/lib/invite-tokens';
import { validatePassword } from '@/lib/password-policy';

const ipRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

const INVALID = 'This reset link is invalid or has expired. Request a new one.';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await ipRateLimit(req, res))) return;

  const token = normalizeInviteToken(req.body?.token);
  if (!token) return res.status(400).json({ error: INVALID });

  const passwordErrors = validatePassword(req.body?.password);
  if (passwordErrors.length) return res.status(400).json({ error: passwordErrors[0], errors: passwordErrors });
  const password = req.body.password as string;

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { email: true, isDemo: true } } },
    });
    const now = new Date();
    if (!record || record.usedAt || record.expiresAt <= now || record.user.isDemo) {
      return res.status(400).json({ error: INVALID });
    }

    // Consume atomically so a raced duplicate submit cannot reset twice.
    const consumed = await prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return res.status(400).json({ error: INVALID });

    const hash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      // Changing the hash rotates passwordVersion, which invalidates all sessions.
      prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
    ]);
    // See the comment above: revocation must not wait for the cache TTL.
    invalidateSessionUser(record.userId);
    await clearLoginAttempts(`account:${record.user.email.toLowerCase()}`);

    return res.status(200).json({ ok: true, message: 'Password updated. You can sign in with your new password.' });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

export default withApiHandler(handler)
