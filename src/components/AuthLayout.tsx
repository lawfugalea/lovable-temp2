import type { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import BrandLogo from '@/components/BrandLogo'

interface AuthLayoutProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

const highlights = [
  'One shared place for the details of daily life',
  'Household membership controls who can take part',
  'Invitations connect the right people to the right home',
]

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-border px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <Link
            href="/landing"
            className="inline-flex w-fit items-center gap-3 rounded-lg text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BrandLogo priority />
          </Link>

          <div className="max-w-xl py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              A household-focused workspace
            </div>
            <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-[-0.035em] xl:text-5xl">
              Less household admin. More room for living.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Bring lists, notes, medicine schedules, and the finances you choose
              to connect into one calm, shared place.
            </p>

            <ul className="mt-10 space-y-4" aria-label="Clankeep highlights">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="max-w-lg text-xs leading-5 text-muted-foreground">
            Clankeep is designed around authenticated household membership. Read
            the{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>{' '}
            to understand how this deployment handles data.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/landing"
              className="mb-8 inline-flex items-center gap-3 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            >
              <BrandLogo />
            </Link>

            <Card className="border-border bg-card shadow-xl shadow-black/5 hover:translate-y-0">
              <header className="border-b border-border px-6 py-6 sm:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {eyebrow}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </header>
              <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
            </Card>

            <nav aria-label="Legal" className="mt-6 flex items-center justify-center gap-5 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground hover:underline hover:underline-offset-4">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground hover:underline hover:underline-offset-4">
                Terms
              </Link>
              <Link href="/landing" className="hover:text-foreground hover:underline hover:underline-offset-4">
                Back to home
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </main>
  )
}
