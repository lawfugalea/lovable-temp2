import type { NextApiRequest, NextApiResponse } from 'next';
// Use a RELATIVE import to avoid TS path alias issues:
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || '').trim();
  const page        = String(req.query.page || '').trim();

  if (!householdId) return res.status(400).json({ ok: false, error: 'householdId required' });
  if (!page)        return res.status(400).json({ ok: false, error: 'page required' });

  try {
    if (req.method === 'GET') {
      const row = await prisma.pageState.findUnique({
        where: { householdId_page: { householdId, page } },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, data: row?.data ?? null, updatedAt: row?.updatedAt ?? null });
    }

    if (req.method === 'PUT') {
      const { data, updatedBy } = req.body as { data: any; updatedBy?: string | null };
      if (!data || typeof data !== 'object') return res.status(400).json({ ok: false, error: 'data object required' });

      const saved = await prisma.pageState.upsert({
        where: { householdId_page: { householdId, page } },
        update: { data, updatedBy: updatedBy ?? null },
        create: { householdId, page, data, updatedBy: updatedBy ?? null },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, updatedAt: saved.updatedAt });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
