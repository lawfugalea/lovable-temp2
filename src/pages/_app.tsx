import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import "../styles/globals.css";
import AuthApp from "@/components/AuthApp";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  useEffect(() => {
    // Request notification permission on app load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Minimal route to isolate Fast Refresh loops without auth/session context
  if (router.pathname === "/plain") {
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
        <Component {...pageProps} />
      </>
    );
  }

  if (process.env.NEXT_PUBLIC_SAFE_MODE === '1') {
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
        <Component {...pageProps} />
      </>
    );
  }

  return <AuthApp Component={Component} pageProps={pageProps} session={session} />;
}
