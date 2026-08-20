import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

import { requireDebugAccess } from '@/lib/debug-guards';
type DebugSession = {
  user?: { id?: string; email?: string | null };
} | null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireDebugAccess(req, res))) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const session = (await getServerSession(req, res, authOptions)) as DebugSession;

  const dbUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id! },
          select: {
            id: true,
            email: true,
            activeHouseholdId: true,
            memberships: { select: { householdId: true, role: true } },
          },
        })
      : null;

  res.status(200).json({
    when: new Date().toISOString(),
    session,
    dbUser,
  });
}

export default withApiHandler(handler)
