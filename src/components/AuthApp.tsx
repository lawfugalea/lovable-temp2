import { SessionProvider, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { APP_BASE_PATH, withBasePath } from "@/lib/base-path";

const InviteBanner = dynamic(() => import("@/components/InviteBanner"), { ssr: false });

type Props = {
  Component: any;
  pageProps: any;
  session: any;
};

function RevokedSessionGuard() {
  const { data, status } = useSession();
  const signingOut = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !data?.user && !signingOut.current) {
      signingOut.current = true;
      void signOut({ callbackUrl: withBasePath('/login') });
    }
  }, [data?.user, status]);

  return null;
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return
    void navigator.serviceWorker.register(withBasePath('/houseflow-sw.js'), { scope: withBasePath('/') })
      .catch((error) => console.error('Service worker registration failed:', error))
  }, [])
  return null
}

export default function AuthApp({ Component, pageProps, session }: Props) {
  return (
    <>
      <Head>
        <link rel="manifest" href={withBasePath("/manifest.json")} />
        <meta name="theme-color" content="#4D6BFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Clankeep" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <SessionProvider basePath={`${APP_BASE_PATH}/api/auth`} session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
        <RevokedSessionGuard />
        <ServiceWorkerRegistrar />
        <InviteBanner />
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}
