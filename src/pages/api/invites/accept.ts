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
  if (!token) return res.redirect("/app?invite_error=missing_token");

  // If not signed in → push to NextAuth and bounce back here with the same token
const session = (await getServerSession(req, res, authOptions)) as {
  user?: { id?: string; email?: string | null };
} | null;

const sid = session?.user?.id;
const semail = session?.user?.email?.toLowerCase() || undefined;
  if (!sid && !semail) {
    const callbackUrl = `/api/invites/accept?token=${encodeURIComponent(token)}`;
    return res.redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
  if (!userId) return res.redirect("/app?invite_error=no_user");

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
  if (!invite) return res.redirect("/app?invite_error=not_found");

  // Email mismatch only if invite targets a specific email
  if (invite.email && semail && invite.email.toLowerCase() !== semail) {
    return res.redirect("/app?invite_error=email_mismatch");
  }

  // Expiry check
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return res.redirect("/app?invite_error=expired");
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

      // Ensure membership exists
      const existing = await tx.membership.findFirst({
        where: { userId: userId!, householdId: invite.householdId },
        select: { id: true },
      });

      if (!existing) {
        try {
          await tx.membership.create({
            data: {
              userId: userId!,
              householdId: invite.householdId,
              role: (invite.role ?? "MEMBER") as MemberRole,
            },
          });
        } catch (e: any) {
          // If you later add a unique index on (userId, householdId), ignore duplicate race
          if (!(String(e?.code || "").includes("P2002"))) throw e;
        }
      }

      // Set active household
      await tx.user.update({
        where: { id: userId! },
        data: { activeHouseholdId: invite.householdId },
      });
    });

    // ✅ Success → into the app with banner
    return res.redirect(`/app?joined=1&household=${invite.householdId}`);
  } catch (err) {
    console.error("Invite accept failed:", err);
    return res.redirect("/app?invite_error=server_error");
  }
}
