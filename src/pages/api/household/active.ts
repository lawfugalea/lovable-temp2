import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getUserIdOr401 } from '@/lib/api-guards';
import { invalidateSessionUser } from '@/lib/session-user-cache';
import { isPriceComparisonRegion } from '@/lib/entitlements-core';
import { isSupermarketComparisonAvailable } from '@/lib/supermarket-consent';

const COUNTRY_RE = /^[A-Z]{2}$/;

const householdSelection = {
  id: true,
  name: true,
  ownerId: true,
  country: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeHouseholdId: true },
    });

    let membership = user?.activeHouseholdId
      ? await prisma.membership.findUnique({
          where: { userId_householdId: { userId, householdId: user.activeHouseholdId } },
          select: { role: true, household: { select: householdSelection } },
        })
      : null;

    if (!membership) {
      membership = await prisma.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, household: { select: householdSelection } },
      });
    }
    if (!membership) return res.status(404).json({ error: 'No household' });

    if (user?.activeHouseholdId !== membership.household.id) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeHouseholdId: membership.household.id },
      });
      invalidateSessionUser(userId);
    }

    return res.status(200).json({
      householdId: membership.household.id,
      name: membership.household.name,
      ownerId: membership.household.ownerId,
      country: membership.household.country,
      priceComparisonRegionSupported: isPriceComparisonRegion(membership.household.country),
      priceComparisonAvailable: isSupermarketComparisonAvailable(),
      createdAt: membership.household.createdAt,
      updatedAt: membership.household.updatedAt,
      role: membership.role,
    });
  }

  if (req.method === 'POST') {
    const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : '';
    if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

    const membership = await prisma.membership.findUnique({
      where: { userId_householdId: { userId, householdId } },
      select: { id: true },
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden: not a member' });

    await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: householdId } });
    // The switcher reloads the page straight after this, so the cached row must
    // not still name the household the user just switched away from.
    invalidateSessionUser(userId);
    return res.status(200).json({ ok: true, householdId });
  }

  if (req.method === 'PATCH') {
    const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : '';
    if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

    const name = typeof req.body?.name === 'string'
      ? req.body.name.trim().replace(/\s+/g, ' ')
      : undefined;
    const country = typeof req.body?.country === 'string'
      ? req.body.country.trim().toUpperCase()
      : undefined;
    if (name === undefined && country === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    if (name !== undefined && (name.length < 2 || name.length > 100)) {
      return res.status(400).json({ error: 'Household name must be between 2 and 100 characters' });
    }
    if (country !== undefined && !COUNTRY_RE.test(country)) {
      return res.status(400).json({ error: 'Country must be a two-letter ISO code' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_householdId: { userId, householdId } },
      select: { role: true },
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden: not a member' });
    if (membership.role !== 'OWNER') return res.status(403).json({ error: 'Owner role required' });

    const household = await prisma.household.update({
      where: { id: householdId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(country !== undefined ? { country } : {}),
      },
      select: householdSelection,
    });
    return res.status(200).json({ household });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiHandler(handler)
