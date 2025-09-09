import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const token = (req.query.token as string | undefined)?.trim();
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    // Find invite and validate
    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        household: {
          select: {
            name: true,
            owner: {
              select: {
                name: true
              }
            }
          }
        }
      },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: "Invite already used or not pending" });
    }

    if (invite.expiresAt <= new Date()) {
      return res.status(400).json({ error: "Invite expired" });
    }

    return res.status(200).json({
      valid: true,
      householdName: invite.household.name,
      inviterName: invite.household.owner.name
    });
  } catch (error) {
    console.error("Invite validation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
