import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

type DebugSession = {
  user?: { id?: string; email?: string | null };
} | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
