import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { withBasePath } from "@/lib/base-path";

type DebugPayload = {
  when: string;
  session: any;
  dbUser: any;
};

export default function DebugLab() {
  const { data: session, update } = useSession();
  const [payload, setPayload] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState("");
  const router = useRouter();

  const activeFromSession =
    (session as any)?.activeHouseholdId ??
    (session as any)?.user?.activeHouseholdId ??
    null;

  const userId = (session as any)?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/debug/session");
      const j = await r.json();
      setPayload(j);
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    if (!householdId) return;
    setLoading(true);
    try {
      const r = await fetch("/api/household/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const ok = r.ok;
      await update({ reason: "debug-activate" } as any); // force JWT/session refresh
      await load();
      if (ok) toast.success("Activated & session refreshed."); else toast.error("Activate failed.");
    } finally {
      setLoading(false);
    }
  }

  function simulateLanding() {
    if (!householdId) return;
    // Mimic /?joined=1&household=... so _app.tsx effect runs
    router.push(`/?joined=1&household=${encodeURIComponent(householdId)}`);
  }

  useEffect(() => {
    load();
  }, []);

  const memberships = useMemo(() => {
    return payload?.dbUser?.memberships ?? [];
  }, [payload]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-3 text-2xl font-semibold">Debug Lab</h1>

      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-sm opacity-70">
          Signed in as:{" "}
          <span className="font-mono">
            {email ?? "—"} {userId ? `(${userId})` : ""}
          </span>
        </div>
        <div className="text-sm">
          Active household (from <code>session</code>):{" "}
          <span className="font-mono">{activeFromSession ?? "null"}</span>
        </div>
        <div className="mt-2 text-sm">
          From DB user:{" "}
          <span className="font-mono">
            {payload?.dbUser?.activeHouseholdId ?? "null"}
          </span>
        </div>
        <div className="mt-2 text-sm">
          Memberships:
          <ul className="mt-1 list-disc pl-6">
            {memberships.length === 0 && <li>None</li>}
            {memberships.map((m: any) => (
              <li key={m.householdId}>
                <span className="font-mono">{m.householdId}</span> — {m.role}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Refresh /api/debug/session
          </button>

          <button
            onClick={() => update({ reason: "manual-update" } as any)}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Force session update()
          </button>

          <Link
            href={withBasePath("/api/auth/signout")}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Sign out
          </Link>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-sm opacity-70">
          Test actions (use a known <code>householdId</code> below)
        </div>

        <div className="flex gap-2">
          <input
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            placeholder="householdId"
            className="w-full rounded-lg border px-3 py-2 font-mono"
          />
          <button
            onClick={activate}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Activate (POST /api/household/activate)
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={simulateLanding}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Simulate invite landing (?joined=1&household=...)
          </button>
          <Link
            href={withBasePath("/")}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Go Home
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-sm opacity-70">Raw payload</div>
        <pre className="max-h-[40vh] overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
{JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
