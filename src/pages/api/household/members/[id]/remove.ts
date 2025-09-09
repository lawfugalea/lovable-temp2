import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { reconcileActiveHousehold } from "@/lib/households";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // Actor must be OWNER of the same household
  const actor = await prisma.membership.findFirst({
    where: { userId: actorId, householdId: membership.householdId },
    select: { role: true },
  });
  if (!actor || actor.role !== "OWNER") {
    return res.status(403).json({ error: "Owner role required" });
  }
  if (membership.role === "OWNER") {
    return res.status(400).json({ error: "Cannot remove an owner" });
  }

  // Remove and reconcile the removed user's active household
  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membership.id } });
    // Important: fix their activeHouseholdId immediately within same tx
    await reconcileActiveHousehold(membership.userId, { write: true, db: tx });
  });

  return res.status(200).json({ ok: true });
}
