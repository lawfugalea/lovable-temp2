import type { AppProps } from "next/app";
import Head from "next/head";
import { ThemeProvider } from "next-themes";
import "../styles/globals.css";
import "../components/ui/minimal-tiptap/styles/index.css";
import AuthApp from "@/components/AuthApp";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeColorSync from "@/components/ThemeColorSync";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { bodyFont, displayFont } from "@/lib/fonts";
import { installBasePathFetch, withBasePath } from "@/lib/base-path";
import { useVisualViewport } from "@/hooks/useVisualViewport";

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
  // Keeps overlays clear of the on-screen keyboard; see the hook for why.
  useVisualViewport();

  if (process.env.NEXT_PUBLIC_SAFE_MODE === '1') {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <FontVariables />
      <ThemeColorSync />
      {/* Inside ThemeProvider so the fallback is themed, but outside the app
          tree so a throw anywhere in a page still lands here. */}
      <ErrorBoundary>
        <ConfirmProvider>
          <AuthApp Component={Component} pageProps={pageProps} session={session} />
        </ConfirmProvider>
      </ErrorBoundary>
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
