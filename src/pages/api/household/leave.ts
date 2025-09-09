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

  // Owners cannot leave their own household (they must transfer ownership first)
  if (membership.role === "OWNER") {
    return res.status(400).json({ error: "Owners cannot leave their household. Transfer ownership first." });
  }

  // Remove membership and reconcile active household
  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membership.id } });
    // Important: fix their activeHouseholdId immediately
    await reconcileActiveHousehold(userId, { write: true });
  });

  return res.status(200).json({ ok: true });
}
