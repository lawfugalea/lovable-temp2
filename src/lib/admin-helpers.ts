// src/lib/admin-helpers.ts
import { getToken } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin-config';
import { isPasswordVersionCurrent } from '@/lib/session-security';

const SECRET = process.env.NEXTAUTH_SECRET;

export async function requireAdmin(req: NextApiRequest) {
  if (!SECRET) {
    throw Object.assign(new Error('NEXTAUTH_SECRET is not configured'), { status: 500 });
  }

  const token = await getToken({ req, secret: SECRET });
  if (!token || !token.sub) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: token.sub as string } });
  if (!user || !isPasswordVersionCurrent(token.passwordVersion, user.password)) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    throw Object.assign(new Error('Admin access required'), { status: 403 });
  }

  return { token, user };
}
