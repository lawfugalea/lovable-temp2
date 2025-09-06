import { SessionProvider, useSession } from "next-auth/react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Head from "next/head";
import "../styles/globals.css";

function InviteBanner() {
  const { query, replace } = useRouter();
  const joined = query.joined === "1";
  const household = typeof query.household === "string" ? query.household : null;
  const inviteError = typeof query.invite_error === "string" ? query.invite_error : null;
  const { update } = useSession();

  // 1) After invite landing, activate preferred household and refresh session
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

  // 2) On first mount, reconcile active household (handles case #1 removal + stale sessions)
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

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    // Request notification permission on app load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HouseFlow" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <SessionProvider session={session} refetchInterval={5 * 60}>
        <InviteBanner />
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}
