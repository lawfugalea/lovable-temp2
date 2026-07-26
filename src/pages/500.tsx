import Head from 'next/head'
import Link from 'next/link'

/**
 * Branded server-error page.
 *
 * Deliberately says nothing about what failed: this renders for any unhandled
 * server error, and the details belong in the log drain, not on a page a user
 * might screenshot and post.
 */
export default function ServerErrorPage() {
  return (
    <>
      <Head><title>Something went wrong – Clankeep</title></Head>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow">
          <p className="font-display text-4xl font-bold text-destructive">500</p>
          <h1 className="mt-2 font-display text-lg font-semibold text-foreground">
            Something went wrong on our side
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your data is safe. Try again in a moment — if it keeps happening, the
            problem is at our end and we are the ones who need to fix it.
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
