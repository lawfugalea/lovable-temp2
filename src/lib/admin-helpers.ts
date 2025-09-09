// src/lib/admin-helpers.ts
import { getToken } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import { prisma } from '@/lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;
const ADMIN_EMAIL = 'lawfinuu@gmail.com';

export async function requireAdmin(req: NextApiRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token || !token.sub) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  
  const user = await prisma.user.findUnique({ where: { id: token.sub as string } });
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  
  if (user.email !== ADMIN_EMAIL) {
    throw Object.assign(new Error('Admin access required'), { status: 403 });
  }
  
  return { token, user };
}

export function isAdminEmail(email: string): boolean {
  return email === ADMIN_EMAIL;
}
