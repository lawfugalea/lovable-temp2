// src/pages/api/household/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface CreateHouseholdRequest {
  name?: string;
  type?: 'family' | 'roommates' | 'couple' | 'personal' | 'other';
  description?: string;
  /** ISO 3166-1 alpha-2; defaults to MT. */
  country?: string;
}

const COUNTRY_RE = /^[A-Z]{2}$/;

interface CreateHouseholdResponse {
  householdId: string;
  name: string;
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1) Ensure signed in
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sessionId = sess?.user?.id as string | undefined;
  const sessionEmail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sessionId && !sessionEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2) Resolve the *actual* user row
  let user = null as null | { id: string; name: string | null; email: string; activeHouseholdId: string | null };
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }
  if (!user && sessionEmail) {
    user = await prisma.user.findFirst({
      where: { email: { equals: sessionEmail, mode: 'insensitive' } },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found for session. Please sign out and sign in again.' });
  }

  // 3) Check if user already has a household
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { householdId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    return res.status(400).json({ 
      error: 'User already belongs to a household',
      existingHouseholdId: existing.householdId,
      message: 'You can only belong to one household at a time. Please leave your current household first.'
    });
  }

  // 4) Parse request body
  const { name, type, description, country: countryRaw }: CreateHouseholdRequest = req.body || {};
  const country = typeof countryRaw === 'string' ? countryRaw.trim().toUpperCase() : 'MT';
  if (!COUNTRY_RE.test(country)) {
    return res.status(400).json({ error: 'Country must be a two-letter ISO code' });
  }

  // 5) Generate smart household name
  const householdName = generateSmartHouseholdName(user, name, type);
  if (!householdName || householdName.length > 100) {
    return res.status(400).json({ error: 'Household name must be 100 characters or fewer' });
  }

  try {
    const household = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user!.id} FOR UPDATE`;
      const concurrentMembership = await tx.membership.findFirst({
        where: { userId: user!.id },
        select: { householdId: true },
      });
      if (concurrentMembership) {
        throw Object.assign(new Error('User already belongs to a household'), { status: 409 });
      }
      const h = await tx.household.create({
        data: {
          name: householdName,
          ownerId: user!.id,
          country,
        },
        select: { id: true, name: true },
      });

      await tx.membership.create({
        data: { userId: user!.id, householdId: h.id, role: 'OWNER' },
      });

      // Set this newly created household as the user's active household
      await tx.user.update({
        where: { id: user!.id },
        data: { activeHouseholdId: h.id },
      });

      return h;
    });

    const response: CreateHouseholdResponse = {
      householdId: household.id,
      name: household.name,
      message: 'Household created successfully!'
    };

    return res.status(201).json(response);
  } catch (e: any) {
    console.error('Failed to create household:', e);
    return res.status(e?.status || 500).json({
      error: e?.status ? e.message : 'Failed to create household',
    });
  }
}

function generateSmartHouseholdName(
  user: { name: string | null; email: string }, 
  customName?: string, 
  type?: string
): string {
  // If user provided a custom name, use it
  if (customName && customName.trim()) {
    return customName.trim();
  }

  const firstName = user.name?.split(' ')[0] || user.email.split('@')[0] || 'My';
  
  // Generate name based on type
  switch (type) {
    case 'family':
      return `${firstName}'s Family`;
    case 'roommates':
      return `${firstName}'s Place`;
    case 'couple':
      return `${firstName}'s Home`;
    case 'personal':
      return `${firstName}'s Household`;
    case 'other':
    default:
      return `${firstName}'s Household`;
  }
}

export default withApiHandler(handler)
