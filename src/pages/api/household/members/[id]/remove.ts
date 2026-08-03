import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { reconcileActiveHousehold } from "@/lib/households";
import { detachUserFromHouseholds } from "@/lib/household-membership";
import { recordActivity } from "@/lib/activity";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const session = (await getServerSession(req, res, authOptions)) as
    | { user?: { id?: string } }
    | null;
  const actorId = session?.user?.id;
  if (!actorId) return res.status(401).json({ error: "Sign in required" });

  const memberId = req.query.id as string;
  if (!memberId) return res.status(400).json({ error: "Missing member id" });

  // Load membership being removed
  const membership = await prisma.membership.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, householdId: true, role: true },
  });
  if (!membership) return res.status(404).json({ error: "Membership not found" });

  let removedLabel = 'A member';
  try {
    await prisma.$transaction(async (tx) => {
      // Role changes for this household take the same lock. This makes the
      // permission check and removal one atomic authorization decision.
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${membership.householdId} FOR UPDATE`;
      const [current, actor] = await Promise.all([
        tx.membership.findUnique({
          where: { id: memberId },
          select: { id: true, userId: true, householdId: true, role: true },
        }),
        tx.membership.findUnique({
          where: {
            userId_householdId: {
              userId: actorId,
              householdId: membership.householdId,
            },
          },
          select: { role: true },
        }),
      ]);
      if (!current || current.householdId !== membership.householdId) {
        throw Object.assign(new Error("Membership not found"), { status: 404 });
      }
      if (actor?.role !== "OWNER") {
        throw Object.assign(new Error("Owner role required"), { status: 403 });
      }
      if (current.role === "OWNER") {
        throw Object.assign(new Error("Cannot remove an owner"), { status: 400 });
      }

      await detachUserFromHouseholds(tx, current.userId, [current.householdId]);
      await reconcileActiveHousehold(current.userId, { write: true, db: tx });

      const removed = await tx.user.findUnique({
        where: { id: current.userId },
        select: { name: true, email: true },
      });
      removedLabel = removed?.name || removed?.email || 'A member';
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status: number }).status)
      : 500;
    return res.status(status).json({
      error: status === 500 ? "Failed to remove member" : (error as Error).message,
    });
  }

  void recordActivity({
    householdId: membership.householdId,
    userId: actorId,
    module: 'home',
    action: 'member-removed',
    summary: `${removedLabel} was removed from the household`,
  });

  return res.status(200).json({ ok: true });
}

export default withApiHandler(handler)
