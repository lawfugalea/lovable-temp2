import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import "../styles/globals.css";
import "../components/ui/minimal-tiptap/styles/index.css";
import AuthApp from "@/components/AuthApp";
import ThemeColorSync from "@/components/ThemeColorSync";
import { Toaster } from "@/components/ui/Toaster";
import { bodyFont, displayFont } from "@/lib/fonts";
import { installBasePathFetch, withBasePath } from "@/lib/base-path";

installBasePathFetch();

function FontVariables() {
  return (
    <style jsx global>{`
      :root {
        --font-body: ${bodyFont.style.fontFamily};
        --font-display: ${displayFont.style.fontFamily};
      }
    `}</style>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  // The landing page is a deliberately light marketing surface.
  const forcedTheme = router.pathname === "/landing" ? "light" : undefined;

  if (process.env.NEXT_PUBLIC_SAFE_MODE === '1') {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange forcedTheme={forcedTheme}>
        <Head>
          <link rel="manifest" href={withBasePath("/manifest.json")} />
          <meta name="theme-color" content="#4D6BFF" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Clankeep" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
        <FontVariables />
        <ThemeColorSync />
        <Component {...pageProps} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange forcedTheme={forcedTheme}>
      <FontVariables />
      <ThemeColorSync />
      <AuthApp Component={Component} pageProps={pageProps} session={session} />
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
