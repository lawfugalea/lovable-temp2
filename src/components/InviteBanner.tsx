import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function InviteBanner() {
  const { query, replace } = useRouter();
  const joined = query.joined === "1";
  const household = typeof query.household === "string" ? query.household : null;
  const inviteError = typeof query.invite_error === "string" ? query.invite_error : null;
  const { update } = useSession();

  useEffect(() => {
    (async () => {
      if (joined && household) {
        try {
          await fetch("/api/household/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ householdId: household }),
          });
          await update({ reason: "invite-accept" } as any);
        } finally {
          replace("/", undefined, { shallow: true });
        }
      }
    })();
  }, [joined, household, replace, update]);

  const ran = useRef(false);
  useEffect(() => {
    (async () => {
      if (ran.current) return;
      ran.current = true;
      try {
        await fetch("/api/household/reconcile", { method: "POST" });
        await update({ reason: "reconcile" } as any);
      } catch {}
    })();
  }, [update]);

  if (!joined && !inviteError) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      {joined && (
        <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 shadow-sm">
          <div className="font-semibold">You’ve joined the household ✅</div>
          {household && <div className="mt-1 text-sm opacity-80">Household: <code>{household}</code></div>}
        </div>
      )}
      {inviteError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
          <div className="font-semibold">We couldn’t accept your invite</div>
          <div className="mt-1 text-sm opacity-80">{inviteError}</div>
        </div>
      )}
    </div>
  );
}


