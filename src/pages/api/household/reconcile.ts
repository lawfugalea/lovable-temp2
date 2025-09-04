import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { reconcileActiveHousehold } from "@/lib/households";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const session = (await getServerSession(req, res, authOptions)) as
    | { user?: { id?: string } }
    | null;

  const uid = session?.user?.id;
  if (!uid) return res.status(401).json({ error: "Sign in required" });

  const { activeId, changed } = await reconcileActiveHousehold(uid, { write: true });
  return res.status(200).json({ ok: true, activeHouseholdId: activeId, changed });
}
