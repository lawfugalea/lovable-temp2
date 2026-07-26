import Head from 'next/head'
import Link from 'next/link'

/**
 * Branded not-found page.
 *
 * Next.js ships a bare black-on-white "404 | This page could not be found",
 * which is especially jarring inside the installed PWA — it looks like the app
 * has been replaced by a browser error.
 *
 * Static (no getServerSideProps) so it stays cheap and can be served from the
 * service worker cache when offline.
 */
export default function NotFoundPage() {
  return (
    <>
      <Head><title>Page not found – Clankeep</title></Head>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow">
          <p className="font-display text-4xl font-bold text-primary">404</p>
          <h1 className="mt-2 font-display text-lg font-semibold text-foreground">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be out of date, or the page may have moved.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
          >
            Back to overview
          </Link>
        </div>
      </main>
    </>
  )
}
