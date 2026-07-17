import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  FileText,
  HeartHandshake,
  Home,
  Landmark,
  LockKeyhole,
  Pill,
  ShieldCheck,
  ShoppingBasket,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { withBasePath } from '@/lib/base-path'

const features = [
  {
    icon: ShoppingBasket,
    title: 'Shared shopping',
    description: 'Build household shopping lists, organize items, and keep everyone working from the same plan.',
  },
  {
    icon: Landmark,
    title: 'Connected finances',
    description: 'Review supported connected accounts and transactions, with controls for what is shared with the household.',
  },
  {
    icon: Pill,
    title: 'Medicine schedules',
    description: 'Keep medicine details, schedules, and the day-to-day record together in one practical view.',
  },
  {
    icon: FileText,
    title: 'Notes that stay useful',
    description: 'Capture the information your household needs, then pin and organize it for quick access.',
  },
  {
    icon: UsersRound,
    title: 'Household membership',
    description: 'Invite the people in your home and manage participation from a shared household workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy-minded access',
    description: 'Authenticated membership checks help scope household data, with privacy controls for sensitive features.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description: 'Set up your HouseFlow account with a strong password and security check.',
  },
  {
    number: '02',
    title: 'Set up or join a household',
    description: 'Start a household workspace or follow an invitation from someone you trust.',
  },
  {
    number: '03',
    title: 'Bring the routine together',
    description: 'Add the lists, notes, schedules, and optional connections that are useful to your home.',
  },
]

export default function LandingPage() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/register')
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <>
      <Head>
        <title>HouseFlow – A calmer way to run your home</title>
        <meta
          name="description"
          content="Bring household shopping, notes, medicine schedules, and connected finances into one shared workspace."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={withBasePath('/favicon.ico')} />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
          <nav
            aria-label="Primary navigation"
            className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          >
            <Link
              href="/landing"
              className="inline-flex items-center gap-3 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Home className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>HouseFlow</span>
            </Link>

            <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a href="#features" className="transition-colors hover:text-foreground">Features</a>
              <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
              <a href="#privacy" className="transition-colors hover:text-foreground">Privacy</a>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={handleLogin}>
                Sign in
              </Button>
              <Button type="button" onClick={handleGetStarted} className="hidden sm:inline-flex">
                Get started
              </Button>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-border">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
            />
            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-28">
              <div className="max-w-2xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                  <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                  Built for the people who share a home
                </div>
                <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                  One calm place to run your home.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  HouseFlow brings the small, important details of household life
                  together—so your people can plan, share, and stay in sync without
                  another scattered group chat.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" size="xl" onClick={handleGetStarted} className="gap-2">
                    Create your account
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" size="xl" variant="outline" onClick={handleLogin}>
                    Sign in
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Household-based access
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Invitation flow included
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Responsive layouts
                  </span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl lg:mx-0">
                <div aria-hidden="true" className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
                <Card className="relative overflow-hidden border-border bg-card shadow-2xl shadow-black/10 hover:translate-y-0">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Household overview</p>
                      <p className="mt-1 font-semibold">Today at home</p>
                    </div>
                    <div className="flex -space-x-2" aria-label="Household members">
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground">A</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-accent text-xs font-semibold text-foreground">M</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground">J</span>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                          <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-xs text-muted-foreground">Shopping</span>
                      </div>
                      <p className="mt-6 text-2xl font-semibold tracking-tight">4 items</p>
                      <p className="mt-1 text-xs text-muted-foreground">Ready for the next shop</p>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                          <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-xs text-muted-foreground">Schedule</span>
                      </div>
                      <p className="mt-6 text-2xl font-semibold tracking-tight">2 reminders</p>
                      <p className="mt-1 text-xs text-muted-foreground">Planned for today</p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/50 p-4 sm:col-span-2">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm">
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Pinned household note</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">Everything important, visible when it is needed.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </section>

          <section id="features" className="scroll-mt-20 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Everyday essentials</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                  Your household, without the busywork.
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                  Start with the tools your home needs today and keep them together as routines change.
                </p>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <Card key={feature.title} className="border-border bg-card p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-muted/40 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">A simple start</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                  From account to shared home in three steps.
                </h2>
              </div>

              <ol className="mt-14 grid gap-8 md:grid-cols-3">
                {steps.map((step) => (
                  <li key={step.number} className="relative border-l border-border pl-6">
                    <span className="text-xs font-semibold tracking-[0.16em] text-primary">{step.number}</span>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="privacy" className="scroll-mt-20 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
                <div className="flex min-h-64 items-center justify-center bg-primary p-10 text-primary-foreground">
                  <LockKeyhole className="h-20 w-20" strokeWidth={1.25} aria-hidden="true" />
                </div>
                <div className="p-7 sm:p-10 lg:p-14">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Privacy and participation</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                    Share a home, not everything.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                    HouseFlow is organized around authenticated household membership,
                    and sensitive areas can include additional sharing controls. No
                    system can promise absolute security, so we document how this
                    deployment handles data and the choices available to you.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-4 text-sm font-medium">
                    <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-foreground">
                      Read the Privacy Policy
                    </Link>
                    <Link href="/terms" className="text-primary underline underline-offset-4 hover:text-foreground">
                      Review the Terms
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-border bg-foreground py-20 text-background">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Make room for a calmer household.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-background/70 sm:text-lg">
                Create an account, set up your household, and bring the routines you already share into one place.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button type="button" size="xl" onClick={handleGetStarted} className="gap-2 bg-background text-foreground hover:bg-background/90">
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="xl" variant="outline" onClick={handleLogin} className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
                  Sign in
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
            <div>
              <Link href="/landing" className="inline-flex items-center gap-3 font-semibold tracking-tight">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Home className="h-4 w-4" aria-hidden="true" />
                </span>
                HouseFlow
              </Link>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                A shared workspace for the practical details of household life.
              </p>
            </div>

            <div className="flex flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#how-it-works" className="hover:text-foreground">How it works</a>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
          <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} HouseFlow. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  )
}
