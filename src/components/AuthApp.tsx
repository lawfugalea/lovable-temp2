import { SessionProvider } from "next-auth/react";
import Head from "next/head";
import dynamic from "next/dynamic";

const InviteBanner = dynamic(() => import("@/components/InviteBanner"), { ssr: false });

type Props = {
  Component: any;
  pageProps: any;
  session: any;
};

export default function AuthApp({ Component, pageProps, session }: Props) {
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
      <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
        <InviteBanner />
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}


