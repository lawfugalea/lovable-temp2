import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { requireMembershipIn } from '@/lib/api-guards';
import { getHouseholdEntitlements } from '@/lib/entitlements';
import { respondUpgradeRequired } from '@/lib/entitlements-core';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.method === 'GET' ? req.query.householdId || '' : req.body?.householdId || '');
  const context = await requireMembershipIn(req, res, householdId);
  if (!context) return;

  if (req.method === 'GET') {
    const children = await prisma.child.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(children);
  }

  if (req.method === 'POST') {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const dateOfBirth = new Date(req.body?.dateOfBirth);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
    if (!name || Number.isNaN(dateOfBirth.getTime())) {
      return res.status(400).json({ error: 'Valid name and date of birth are required' });
    }
    if (name.length > 80 || dateOfBirth > new Date() || (notes?.length || 0) > 2000) {
      return res.status(400).json({ error: 'Invalid child details' });
    }

    // Adding children is plan-limited; everything about existing children stays free.
    const entitlements = await getHouseholdEntitlements(householdId);
    const existingCount = await prisma.child.count({ where: { householdId } });
    if (existingCount >= entitlements.maxChildren) {
      return respondUpgradeRequired(res, 'children');
    }

    const child = await prisma.child.create({
      data: { householdId, name, dateOfBirth, notes },
    });
    return res.status(201).json(child);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiHandler(handler)
