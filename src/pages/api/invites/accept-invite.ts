// src/pages/api/invites/accept.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { InviteStatus, MemberRole } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const token = (req.query.token as string | undefined)?.trim();
  if (!token) return res.status(400).json({ error: "Missing token" });

  // If not signed in → push to NextAuth and bounce back here with the same token
const session = (await getServerSession(req, res, authOptions)) as {
  user?: { id?: string; email?: string | null };
} | null;

const sid = session?.user?.id;
const semail = session?.user?.email?.toLowerCase() || undefined;
  if (!sid && !semail) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Resolve DB user id (your original pattern)
  let userId: string | null = null;
  if (sid) {
    const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } });
    if (u) userId = u.id;
  }
  if (!userId && semail) {
    const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } });
    if (u) userId = u.id;
  }
  if (!userId) return res.status(401).json({ error: "User not found" });

  // Load invite by token
  const invite = await prisma.invite.findFirst({
    where: { token },
    select: {
      id: true,
      email: true,            // might be null
      householdId: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!invite) return res.status(404).json({ error: "Invite not found" });

  // Email mismatch only if invite targets a specific email
  if (invite.email && semail && invite.email.toLowerCase() !== semail) {
    return res.status(400).json({ error: "Email mismatch" });
  }

  // Expiry check
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "Invite expired" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // If not already accepted, set to ACCEPTED
      if (invite.status !== ("ACCEPTED" as InviteStatus)) {
        await tx.invite.update({
          where: { id: invite.id },
          data: {
            status: "ACCEPTED" as InviteStatus,
            acceptedById: userId!,
            acceptedAt: new Date(),
          },
        });
      }

      // SINGLE HOUSEHOLD MODEL: Remove user from any existing households
      await tx.membership.deleteMany({
        where: { userId: userId! },
      });

      // Create new membership in the invited household
      await tx.membership.create({
        data: {
          userId: userId!,
          householdId: invite.householdId,
          role: (invite.role ?? "MEMBER") as MemberRole,
        },
      });

      // Set this household as the user's active (and only) household
      await tx.user.update({
        where: { id: userId! },
        data: { activeHouseholdId: invite.householdId },
      });
    });

    // ✅ Success
    return res.status(200).json({ success: true, householdId: invite.householdId });
  } catch (err) {
    console.error("Invite accept failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
