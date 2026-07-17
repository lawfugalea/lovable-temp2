import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";
import "../components/ui/minimal-tiptap/styles/index.css";
import AuthApp from "@/components/AuthApp";
import { Toaster } from "@/components/ui/Toaster";
import { installBasePathFetch, withBasePath } from "@/lib/base-path";

installBasePathFetch();

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  if (process.env.NEXT_PUBLIC_SAFE_MODE === '1') {
    return (
      <>
        <Head>
          <link rel="manifest" href={withBasePath("/manifest.json")} />
          <meta name="theme-color" content="#a8412a" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="HouseFlow" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <AuthApp Component={Component} pageProps={pageProps} session={session} />
      <Toaster position="top-center" richColors />
    </>
  );
}
