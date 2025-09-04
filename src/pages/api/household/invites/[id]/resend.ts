// src/pages/api/household/invites/[id]/resend.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { sendInviteEmail } from "@/lib/mailer";
import { appUrl } from "@/lib/links";

/** Resolve the current user's DB id from the NextAuth session (id first, then email). */
async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions)) as
    | { user?: { id?: string; email?: string | null } }
    | null;

  const sid = sess?.user?.id;
  const semail = sess?.user?.email?.toLowerCase();

  if (!sid && !semail) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (sid) {
    const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } });
    if (u) return u.id;
  }

  if (semail) {
    const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } });
    if (u) return u.id;
  }

  res.status(401).json({ error: "User for session not found. Please sign out and sign in again." });
  return null;
}

/** Ensure the current user is a member (optionally owner) of a given household. */
async function requireMembershipIn(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string,
  ownerOnly = false
): Promise<boolean> {
  const userId = await resolveUserId(req, res);
  if (!userId) return false;

  const m = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { role: true },
  });

  if (!m) {
    res.status(403).json({ error: "Forbidden: not a member of this household" });
    return false;
  }
  if (ownerOnly && m.role !== "OWNER") {
    res.status(403).json({ error: "Forbidden: owner role required" });
    return false;
  }
  return true;
}

/** Build the absolute Accept URL using APP_URL/NEXTAUTH_URL. */
function makeAcceptUrl(token: string) {
  return appUrl(`/api/invites/accept?token=${encodeURIComponent(token)}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const { id } = req.query as { id: string };

  // Load invite basics
  const invite = await prisma.invite.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      householdId: true,
      token: true,
    },
  });
  if (!invite) return res.status(404).json({ error: "Invite not found" });

  // Authorization: must be OWNER of the household to resend
  if (!(await requireMembershipIn(req, res, invite.householdId, true))) return;

  if (!invite.email) return res.status(400).json({ error: "This invite has no email to resend" });
  if (invite.status !== "PENDING") return res.status(400).json({ error: "Only pending invites can be resent" });
  if (invite.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Invite is expired" });

  const household = await prisma.household.findUnique({
    where: { id: invite.householdId },
    select: { name: true },
  });

  const acceptUrl = makeAcceptUrl(invite.token);

  const r = await sendInviteEmail({
    to: invite.email,
    acceptUrl,
    inviterName: household?.name ? `${household.name} owner` : "Household owner",
    householdName: household?.name || "your household",
  });

  if (!r.ok) return res.status(502).json({ error: r.error, from: r.fromUsed, to: r.to });
  return res.status(200).json({ ok: true, id: r.providerId, from: r.fromUsed, to: r.to });
}
