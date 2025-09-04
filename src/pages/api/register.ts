import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { name, email, password } = req.body ?? {};

    const _email = (email ?? '').toString().trim().toLowerCase();
    const _password = (password ?? '').toString();

    if (!_email || !_password) return res.status(400).json({ ok: false, error: 'Email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email)) return res.status(400).json({ ok: false, error: 'Invalid email' });
    if (_password.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });

    const exists = await prisma.user.findUnique({ where: { email: _email } });
    if (exists) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const hash = await bcrypt.hash(_password, 10);

    const user = await prisma.user.create({
      data: { name: name?.toString() || null, email: _email, password: hash },
      select: { id: true, email: true, name: true },
    });

    return res.status(201).json({ ok: true, user });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
