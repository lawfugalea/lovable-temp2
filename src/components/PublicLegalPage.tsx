import type { ReactNode } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import type { PublicLegalConfig } from '@/lib/public-legal'
import BrandLogo from '@/components/BrandLogo'
import KelmaWidget from '@/components/KelmaWidget'

type PublicLegalPageProps = {
  title: string
  description: string
  config: PublicLegalConfig
  children: ReactNode
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PublicLegalPage({
  title,
  description,
  config,
  children,
}: PublicLegalPageProps) {
  return (
    <>
      <Head>
        <title>{title} | Clankeep</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/landing" className="flex items-center gap-3 text-foreground">
              <BrandLogo priority />
            </Link>
            <Link
              href="/landing"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Clankeep
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-soft-sm sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{description}</p>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: {config.lastUpdated}</p>
          </div>

          {!config.contactConfigured && (
            <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              The deployment operator has not configured a public contact email yet. Set{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5">DATA_PROTECTION_EMAIL</code> before using this page for production open banking.
            </div>
          )}

          <article className="space-y-10 rounded-2xl border border-border bg-card p-6 shadow-soft-sm sm:p-10">
            {children}
          </article>

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {config.contactEmail ? (
                <a className="font-medium text-primary hover:underline" href={`mailto:${config.contactEmail}`}>
                  {config.contactEmail}
                </a>
              ) : (
                <span>Contact email not configured</span>
              )}
            </div>
            <nav className="flex gap-4" aria-label="Legal pages">
              <Link href="/privacy" className="hover:text-primary hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:text-primary hover:underline">Terms</Link>
            </nav>
          </div>
        </main>
      </div>
      <KelmaWidget />
    </>
  )
}
