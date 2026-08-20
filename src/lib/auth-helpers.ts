// src/lib/auth-helpers.ts
import { getToken } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import { prisma } from '@/lib/prisma';
import { isPasswordVersionCurrent } from '@/lib/session-security';

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function requireUser(req: NextApiRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token || !token.sub) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: token.sub as string } });
  if (!user || !isPasswordVersionCurrent(token.passwordVersion, user.password)) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return { token, user };
}

export async function ensureOwner(userId: string, householdId: string) {
  const hh = await prisma.household.findUnique({ where: { id: householdId } });
  if (!hh) throw Object.assign(new Error('Household not found'), { status: 404 });

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId, role: 'OWNER' },
  });
  if (!membership) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return hh;
}

export function acceptUrlForToken(token: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = new URL('/invites/accept', base);
  url.searchParams.set('token', token);
  return url.toString();
}
