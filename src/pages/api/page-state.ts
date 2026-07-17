import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Legacy finance PageState rows are intentionally retained for export, but the
// rebuilt finance feature no longer exposes a generic JSON state endpoint.
const ALLOWED_PAGES = new Set<string>();
const MAX_STATE_BYTES = 750_000;

async function requireUserId(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function requireMembership(userId: string, householdId: string) {
  return prisma.membership.findFirst({
    where: { userId, householdId },
    select: { id: true, role: true },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const householdId = (req.query.householdId as string) || (req.body?.householdId as string) || '';
  const page = (req.query.page as string) || (req.body?.page as string) || '';
  if (!householdId || !page) return res.status(400).json({ error: 'householdId and page are required' });
  if (!ALLOWED_PAGES.has(page)) return res.status(400).json({ error: 'Unsupported page state' });

  const membership = await requireMembership(userId, householdId);
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member of this household' });

  if (method === 'GET') {
    const ps = await prisma.pageState.findUnique({ where: { householdId_page: { householdId, page } } });
    return res.status(200).json({ data: ps?.data ?? null, updatedAt: ps?.updatedAt ?? null });
  }

  if (method === 'POST' || method === 'PUT') {
    const data = req.body?.data;
    if (data === undefined) return res.status(400).json({ error: 'data is required' });
    let serialized = '';
    try {
      serialized = JSON.stringify(data);
    } catch {
      return res.status(400).json({ error: 'data must be valid JSON' });
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
      return res.status(413).json({ error: 'Page state is too large' });
    }

    const expectedValue = req.body?.expectedUpdatedAt;
    const expectedUpdatedAt = typeof expectedValue === 'string' ? new Date(expectedValue) : null;
    if (expectedValue !== undefined && expectedValue !== null && Number.isNaN(expectedUpdatedAt?.getTime())) {
      return res.status(400).json({ error: 'Invalid expectedUpdatedAt value' });
    }

    try {
      const existing = await prisma.pageState.findUnique({
        where: { householdId_page: { householdId, page } },
        select: { id: true, data: true, updatedAt: true },
      });

      if (existing) {
        if (expectedValue === null || (expectedUpdatedAt && existing.updatedAt.getTime() !== expectedUpdatedAt.getTime())) {
          return res.status(409).json({
            error: 'This page was updated by another household member. Reload before saving again.',
            data: existing.data,
            updatedAt: existing.updatedAt,
          });
        }
        const result = expectedUpdatedAt
          ? await prisma.pageState.updateMany({
              where: { id: existing.id, updatedAt: expectedUpdatedAt },
              data: { data, updatedBy: userId },
            })
          : await prisma.pageState.updateMany({
              where: { id: existing.id },
              data: { data, updatedBy: userId },
            });
        if (result.count !== 1) {
          const current = await prisma.pageState.findUnique({
            where: { id: existing.id },
            select: { data: true, updatedAt: true },
          });
          return res.status(409).json({
            error: 'This page was updated by another household member. Reload before saving again.',
            data: current?.data ?? null,
            updatedAt: current?.updatedAt ?? null,
          });
        }
        const saved = await prisma.pageState.findUniqueOrThrow({
          where: { id: existing.id },
          select: { data: true, updatedAt: true },
        });
        return res.status(200).json(saved);
      }

      if (expectedUpdatedAt) {
        return res.status(409).json({ error: 'Page state no longer exists. Reload before saving again.' });
      }
      const saved = await prisma.pageState.create({
        data: { householdId, page, data, updatedBy: userId },
        select: { data: true, updatedAt: true },
      });
      return res.status(200).json(saved);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'This page was created by another household member. Reload before saving again.' });
      }
      throw error;
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end('Method Not Allowed');
}
