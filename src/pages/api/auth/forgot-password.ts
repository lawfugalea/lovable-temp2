import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { createRateLimit, createEmailRateLimit } from '@/lib/rate-limiter';
import { createInviteToken, hashInviteToken } from '@/lib/invite-tokens';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { appUrl } from '@/lib/links';
import { isDemoEmail } from '@/lib/demo';

export const RESET_TOKEN_TTL_MINUTES = 60;

const ipRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 });
const emailRateLimit = createEmailRateLimit(60 * 60 * 1000, 3);

/**
 * Always answers 200 with the same body for well-formed requests, whether or
 * not the address has an account — the response must not leak which emails
 * are registered.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await ipRateLimit(req, res))) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!(await emailRateLimit(req, res))) return;

  const generic = { ok: true, message: 'If that address has an account, a reset link is on its way.' };

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, isDemo: true },
    });
    if (!user || user.isDemo || isDemoEmail(user.email)) return res.status(200).json(generic);

    const rawToken = createInviteToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await prisma.$transaction([
      // One outstanding link at a time: a new request invalidates older ones.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashInviteToken(rawToken), expiresAt },
      }),
    ]);

    const result = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: appUrl(`/reset-password?token=${rawToken}`),
      expiresMinutes: RESET_TOKEN_TTL_MINUTES,
    });
    if (!result.ok) console.warn('Password reset email not sent:', result.error);
    else console.info(`Password reset email sent (resend id ${result.providerId ?? 'unknown'})`);

    return res.status(200).json(generic);
  } catch (err) {
    console.error('forgot-password error:', err);
    // Still generic: internal state must not be observable from outside.
    return res.status(200).json(generic);
  }
}

export default withApiHandler(handler)
