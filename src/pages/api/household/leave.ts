import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { reconcileActiveHousehold } from "@/lib/households";
import { detachUserFromHouseholds } from "@/lib/household-membership";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const session = (await getServerSession(req, res, authOptions)) as
    | { user?: { id?: string } }
    | null;
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ error: "Sign in required" });

  const { householdId } = req.body as { householdId?: string };
  if (!householdId) return res.status(400).json({ error: "Missing householdId" });

  // Load user's membership in this household
  const membership = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { id: true, role: true },
  });
  if (!membership) return res.status(404).json({ error: "Not a member of this household" });

  // Remove membership and reconcile active household. An owner may leave only
  // when another owner remains, so a household can never become ownerless.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId} FOR UPDATE`;
      const current = await tx.membership.findUnique({
        where: { id: membership.id },
        select: { id: true, userId: true, householdId: true, role: true },
      });
      if (!current) throw Object.assign(new Error("Not a member of this household"), { status: 404 });
      if (current.role === "OWNER") {
        const replacement = await tx.membership.findFirst({
          where: { householdId, role: "OWNER", id: { not: current.id } },
          orderBy: { createdAt: "asc" },
          select: { userId: true },
        });
        if (!replacement) {
          throw Object.assign(new Error("Promote another member before the final owner can leave"), { status: 409 });
        }
        await tx.household.updateMany({
          where: { id: householdId, ownerId: userId },
          data: { ownerId: replacement.userId },
        });
      }
      await detachUserFromHouseholds(tx, userId, [householdId]);
      // Important: fix their activeHouseholdId immediately within same tx
      await reconcileActiveHousehold(userId, { write: true, db: tx });
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status: number }).status)
      : 500;
    return res.status(status).json({
      error: status === 500 ? "Failed to leave household" : (error as Error).message,
    });
  }

  return res.status(200).json({ ok: true });
}

export default withApiHandler(handler)
