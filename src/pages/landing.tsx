import { useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import {
  ArrowRight,
  Loader2,
  BadgeCheck,
  BellRing,
  Check,
  FileText,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  Pill,
  Server,
  ShoppingBasket,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { withBasePath } from '@/lib/base-path'
import BrandLogo from '@/components/BrandLogo'

const heroChecklist = [
  { name: 'Milk (2L)', store: 'Smart', price: '€1.09', done: true },
  { name: 'Bananas (1kg)', store: 'Greens', price: '€1.85', done: true },
  { name: 'Chicken breast', store: 'Smart', price: '€6.20', done: false },
  { name: 'Washing tablets', store: 'Welbee’s', price: '€8.75', done: false },
]

const storeBars = [
  { store: 'Smart', total: '€23.40', width: '78%', cheapest: true },
  { store: 'Greens', total: '€25.15', width: '86%', cheapest: false },
  { store: 'Welbee’s', total: '€27.45', width: '94%', cheapest: false },
]

const stats = [
  { value: '5', label: 'supermarket catalogues compared' },
  { value: '24h', label: 'automatic price refresh cycle' },
  { value: '1', label: 'shared home for every routine' },
  { value: '100%', label: 'of your data on your own server' },
]

const bentoFeatures = [
  {
    icon: Pill,
    tone: 'coral',
    title: 'A medicine cabinet with a memory',
    description:
      'Courses, doses, and schedules for every member of the house — with push reminders so 6 pm antibiotics never depend on anyone’s memory. Fever journals and printable PDF reports keep the doctor in the loop.',
    bullets: ['Dose-by-dose schedules', 'Push reminders', 'Child health journal & PDF reports'],
  },
  {
    icon: Landmark,
    tone: 'blue',
    title: 'Finances, visible — never touchable',
    description:
      'Connect supported bank accounts read-only. See balances and transactions together, catch subscriptions before they renew, and decide exactly what the household sees.',
    bullets: ['Read-only open banking', 'Subscription radar', 'Per-account sharing controls'],
  },
  {
    icon: FileText,
    tone: 'purple',
    title: 'Notes that behave like notes',
    description:
      'A proper rich-text editor — headings, tables, images, checklists. Pin the boiler code, the babysitter brief, the Wi-Fi password. Findable when it matters.',
    bullets: ['Rich editor with tables & images', 'Pinned essentials', 'Shared with the household'],
  },
  {
    icon: UsersRound,
    tone: 'teal',
    title: 'The whole clan, one invite away',
    description:
      'Invite partners, kids, grandparents by email or link. Everyone sees the household — nobody wrestles with a setup wizard.',
    bullets: ['Email & link invitations', 'Household-scoped access', 'Admin panel included'],
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description: 'A minute of setup: name, email, strong password. That’s the whole form.',
  },
  {
    number: '02',
    title: 'Gather your clan',
    description: 'Start a household and send invites by email or link. Everyone lands in the same shared space.',
  },
  {
    number: '03',
    title: 'Move the chaos in',
    description: 'Shopping lists, medicine schedules, notes, and the optional bank connections your home actually uses.',
  },
]

const privacyPoints = [
  {
    icon: Server,
    title: 'Self-hosted, full stop',
    description: 'ClanKeep runs on your own server with your own PostgreSQL database. Your family’s life never becomes someone else’s dataset.',
  },
  {
    icon: LockKeyhole,
    title: 'Household-scoped by design',
    description: 'Access is checked against authenticated household membership on every request — not bolted on afterwards.',
  },
  {
    icon: BadgeCheck,
    title: 'Honest about limits',
    description: 'No system can promise absolute security, so we document exactly how data is handled and the choices you control.',
  },
]

function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('lp-visible'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const toneStyles: Record<string, { chip: string; icon: string }> = {
  teal: { chip: 'bg-brand-teal/10', icon: 'text-brand-teal' },
  coral: { chip: 'bg-brand-coral/10', icon: 'text-brand-coral' },
  blue: { chip: 'bg-brand-blue/10', icon: 'text-brand-blue' },
  purple: { chip: 'bg-brand-purple/10', icon: 'text-brand-purple' },
}

const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED === 'true'

export default function LandingPage() {
  const router = useRouter()
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoError, setDemoError] = useState('')
  useReveal()

  const handleGetStarted = () => router.push('/register')
  const handleLogin = () => router.push('/login')

  const handleTryDemo = async () => {
    setDemoBusy(true)
    setDemoError('')
    try {
      const response = await fetch('/api/demo/start', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The demo is unavailable right now')
      const result = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
      if (result?.error) throw new Error('The demo is unavailable right now')
      void router.push('/dashboard')
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'The demo is unavailable right now')
      setDemoBusy(false)
    }
  }

  return (
    <>
      <Head>
        <title>ClanKeep — Together. Organised. At home.</title>
        <meta
          name="description"
          content="The self-hosted household HQ: shared shopping with Malta supermarket price comparison, medicine schedules with reminders, read-only bank visibility, and notes — all in one private home."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href={withBasePath('/logo.png')} />
      </Head>

      <div className="lp min-h-screen bg-[#F7F8FD] text-brand-heading">
        {/* ── Nav ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-slate-900/[0.06] bg-[#F7F8FD]/85 backdrop-blur-xl">
          <nav
            aria-label="Primary navigation"
            className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          >
            <Link
              href="/landing"
              className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
            >
              <BrandLogo priority />
            </Link>

            <div className="hidden items-center gap-8 text-[15px] font-medium text-brand-body md:flex">
              <a href="#features" className="transition-colors hover:text-brand-heading">Features</a>
              <a href="#prices" className="transition-colors hover:text-brand-heading">Price compare</a>
              <a href="#pricing" className="transition-colors hover:text-brand-heading">Pricing</a>
              <a href="#privacy" className="transition-colors hover:text-brand-heading">Privacy</a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogin}
                className="rounded-full px-4 py-2 text-sm font-semibold text-brand-body transition-colors hover:bg-slate-900/[0.05] hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={handleGetStarted}
                className="lp-cta hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white sm:inline-flex"
              >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </header>

        <main>
          {/* ── Hero ──────────────────────────────────────────── */}
          <section className="relative overflow-hidden">
            <div aria-hidden="true" className="lp-hero-glow" />
            <div aria-hidden="true" className="lp-grain" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-28 lg:pt-24">
              <div className="max-w-2xl">
                <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold text-brand-purple shadow-sm backdrop-blur">
                  <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                  Together. Organised. At home.
                </div>

                <h1 className="lp-display lp-rise mt-6 text-[2.75rem] font-bold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[4.6rem]" style={{ animationDelay: '90ms' }}>
                  Run your home
                  <br />
                  like a <span className="lp-gradient-text">team</span>,
                  <br />
                  not a group chat.
                </h1>

                <p className="lp-rise mt-6 max-w-xl text-lg leading-relaxed text-brand-body sm:text-xl" style={{ animationDelay: '180ms' }}>
                  ClanKeep is the household HQ that keeps shopping lists, medicine
                  schedules, family finances, and shared notes in one calm, private
                  place — and even tells you which Malta supermarket has the
                  cheapest basket this week.
                </p>

                <div className="lp-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '270ms' }}>
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="lp-cta inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white"
                  >
                    Start your household — free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-8 py-4 text-base font-semibold text-brand-heading shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    Sign in
                  </button>
                  {demoEnabled && (
                    <button
                      type="button"
                      onClick={() => void handleTryDemo()}
                      disabled={demoBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/5 px-8 py-4 text-base font-semibold text-brand-purple transition-all hover:-translate-y-0.5 hover:bg-brand-purple/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:opacity-60"
                    >
                      {demoBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {demoBusy ? 'Setting up your demo…' : 'Try the demo'}
                    </button>
                  )}
                </div>
                {demoError && <p className="lp-rise mt-3 text-sm font-medium text-brand-coral">{demoError}</p>}

                <div className="lp-rise mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-brand-body" style={{ animationDelay: '360ms' }}>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                    Self-hosted &amp; private
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                    Whole family included
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                    No ads, ever
                  </span>
                </div>
              </div>

              {/* Hero product mock */}
              <div className="lp-rise relative mx-auto w-full max-w-[540px] lg:mx-0" style={{ animationDelay: '240ms' }}>
                <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-blue/20 via-brand-purple/15 to-brand-teal/20 blur-3xl" />

                <div className="relative rounded-[1.75rem] border border-slate-900/[0.07] bg-white p-1.5 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.35)]">
                  <div className="rounded-[1.4rem] bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-muted">Saturday shop</p>
                        <p className="lp-display mt-0.5 text-lg font-bold tracking-tight">The Galea household</p>
                      </div>
                      <div className="flex -space-x-2.5" aria-label="Household members">
                        <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-white bg-brand-teal text-xs font-bold text-white">R</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-white bg-brand-coral text-xs font-bold text-white">S</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-white bg-brand-purple text-xs font-bold text-white">M</span>
                      </div>
                    </div>

                    <ul className="px-5 py-3">
                      {heroChecklist.map((item) => (
                        <li key={item.name} className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0">
                          <span
                            aria-hidden="true"
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                              item.done ? 'border-brand-teal bg-brand-teal text-white' : 'border-slate-200 bg-white'
                            }`}
                          >
                            {item.done && <Check className="h-3 w-3" strokeWidth={3.5} />}
                          </span>
                          <span className={`flex-1 text-sm font-medium ${item.done ? 'text-brand-muted line-through' : 'text-brand-heading'}`}>
                            {item.name}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-body">{item.store}</span>
                          <span className="w-12 text-right text-sm font-bold tabular-nums text-brand-heading">{item.price}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-[#4D6BFF] to-[#7B61FF] p-4 text-white">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Cheapest full basket</p>
                        <Sparkles className="h-4 w-4 text-white/80" aria-hidden="true" />
                      </div>
                      <div className="mt-2.5 space-y-2">
                        {storeBars.map((bar) => (
                          <div key={bar.store} className="flex items-center gap-3">
                            <span className="w-16 shrink-0 text-xs font-semibold text-white/90">{bar.store}</span>
                            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                              <span
                                className={`absolute inset-y-0 left-0 rounded-full ${bar.cheapest ? 'bg-[#2EE6C8]' : 'bg-white/60'}`}
                                style={{ width: bar.width }}
                              />
                            </span>
                            <span className="w-14 shrink-0 text-right text-xs font-bold tabular-nums">{bar.total}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[13px] font-semibold text-[#2EE6C8]">Smart saves you €4.05 this week</p>
                    </div>
                  </div>
                </div>

                {/* Floating chips */}
                <div className="lp-float absolute -left-4 top-20 hidden items-center gap-2.5 rounded-2xl border border-slate-900/[0.07] bg-white px-4 py-3 shadow-xl sm:flex lg:-left-14">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-coral/10 text-brand-coral">
                    <Pill className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold leading-tight">Mia’s antibiotics</p>
                    <p className="text-xs font-medium text-brand-muted">Reminder · today, 6:00 pm</p>
                  </div>
                </div>

                <div className="lp-float-slow absolute -bottom-6 -right-3 hidden items-center gap-2.5 rounded-2xl border border-slate-900/[0.07] bg-white px-4 py-3 shadow-xl sm:flex lg:-right-8">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold leading-tight">Netflix renews Friday</p>
                    <p className="text-xs font-medium text-brand-muted">Subscription radar · €13.99</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stats strip ───────────────────────────────────── */}
          <section className="border-y border-slate-900/[0.06] bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-2 divide-slate-900/[0.06] px-4 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8">
              {stats.map((stat, i) => (
                <div key={stat.label} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="px-2 py-8 text-center lg:py-10">
                  <p className="lp-display text-4xl font-bold tracking-tight text-brand-heading sm:text-5xl">
                    <span className="lp-gradient-text">{stat.value}</span>
                  </p>
                  <p className="mx-auto mt-2 max-w-[180px] text-sm font-medium leading-snug text-brand-body">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Price comparison deep dive ────────────────────── */}
          <section id="prices" className="scroll-mt-20 bg-brand-dark py-24 text-white sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
                <div data-reveal>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2EE6C8]">Only in ClanKeep</p>
                  <h2 className="lp-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
                    Know the cheapest supermarket before you grab the keys.
                  </h2>
                  <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
                    ClanKeep reads the public online catalogues of Malta’s
                    supermarkets — Smart, Greens, Welbee’s and more — and prices
                    your actual shopping list at each store. Not last month’s
                    flyer: prices refresh automatically every day.
                  </p>
                  <ul className="mt-8 space-y-4 text-[15px] font-medium text-slate-200">
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#2EE6C8]" strokeWidth={3} aria-hidden="true" />
                      Your whole basket totalled per store, cheapest highlighted
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#2EE6C8]" strokeWidth={3} aria-hidden="true" />
                      Only fresh prices count — anything older than 48 hours is flagged, never silently used
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#2EE6C8]" strokeWidth={3} aria-hidden="true" />
                      Honest estimates for planning a shop — delivery fees and in-store offers noted as exclusions
                    </li>
                  </ul>
                </div>

                <div data-reveal style={{ transitionDelay: '120ms' }}>
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur">
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                      <p className="text-sm font-bold">Weekly shop · 14 items</p>
                      <span className="rounded-full bg-[#2EE6C8]/15 px-3 py-1 text-xs font-bold text-[#2EE6C8]">Prices updated today</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-3 font-bold">Item</th>
                            <th className="px-4 py-3 text-right font-bold">Smart</th>
                            <th className="px-4 py-3 text-right font-bold">Greens</th>
                            <th className="px-6 py-3 text-right font-bold">Welbee’s</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-200">
                          <tr className="border-b border-white/[0.06]">
                            <td className="px-6 py-3 font-medium">Olive oil 750ml</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-[#2EE6C8]">€6.49</td>
                            <td className="px-4 py-3 text-right tabular-nums">€6.95</td>
                            <td className="px-6 py-3 text-right tabular-nums">€7.10</td>
                          </tr>
                          <tr className="border-b border-white/[0.06]">
                            <td className="px-6 py-3 font-medium">Pasta rigatoni 500g</td>
                            <td className="px-4 py-3 text-right tabular-nums">€1.15</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-[#2EE6C8]">€0.99</td>
                            <td className="px-6 py-3 text-right tabular-nums">€1.20</td>
                          </tr>
                          <tr className="border-b border-white/[0.06]">
                            <td className="px-6 py-3 font-medium">Nappies size 4</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-[#2EE6C8]">€9.80</td>
                            <td className="px-4 py-3 text-right tabular-nums">€10.40</td>
                            <td className="px-6 py-3 text-right tabular-nums">€10.15</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-3 text-slate-400">+ 11 more items…</td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3" />
                            <td className="px-6 py-3" />
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-white/10 bg-white/[0.04] font-bold">
                            <td className="px-6 py-4">Basket total</td>
                            <td className="px-4 py-4 text-right tabular-nums text-[#2EE6C8]">€41.22</td>
                            <td className="px-4 py-4 text-right tabular-nums">€43.87</td>
                            <td className="px-6 py-4 text-right tabular-nums">€45.30</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Illustrative prices. Estimates for planning; catalogue prices can differ from in-store branches.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Features bento ────────────────────────────────── */}
          <section id="features" className="scroll-mt-20 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl" data-reveal>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-purple">Everything a home juggles</p>
                <h2 className="lp-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-brand-heading sm:text-5xl">
                  Five apps’ worth of chaos.
                  <br />
                  One calm HQ.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-brand-body">
                  The shopping app, the pill reminder, the banking app, the notes
                  app, and the group chat that glues them together — replaced by
                  one place the whole household actually shares.
                </p>
              </div>

              <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {/* Big shopping card */}
                <div
                  data-reveal
                  className="lp-card group relative overflow-hidden rounded-3xl border border-slate-900/[0.07] bg-white p-8 md:col-span-2"
                >
                  <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-teal/10 blur-2xl transition-transform duration-700 group-hover:scale-125" />
                  <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <ShoppingBasket className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="lp-display relative mt-6 text-2xl font-bold tracking-tight">
                    One list. Every store priced.
                  </h3>
                  <p className="relative mt-3 max-w-xl leading-relaxed text-brand-body">
                    Anyone in the household adds items; ClanKeep organises the list
                    and prices it across Malta’s supermarket catalogues. Tick items
                    off in the aisle from any phone — the list updates for everyone.
                  </p>
                  <ul className="relative mt-6 flex flex-wrap gap-2">
                    {['Shared in real use', 'Malta price comparison', 'Cheapest-basket totals', 'Works on every phone'].map((tag) => (
                      <li key={tag} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-[13px] font-semibold text-brand-body">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>

                {bentoFeatures.map((feature, i) => {
                  const tone = toneStyles[feature.tone]
                  return (
                    <div
                      key={feature.title}
                      data-reveal
                      style={{ transitionDelay: `${(i % 3) * 90}ms` }}
                      className="lp-card rounded-3xl border border-slate-900/[0.07] bg-white p-8"
                    >
                      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone.chip} ${tone.icon}`}>
                        <feature.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <h3 className="lp-display mt-6 text-xl font-bold tracking-tight">{feature.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-brand-body">{feature.description}</p>
                      <ul className="mt-5 space-y-2">
                        {feature.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-center gap-2.5 text-sm font-medium text-brand-body">
                            <Check className={`h-4 w-4 shrink-0 ${tone.icon}`} strokeWidth={3} aria-hidden="true" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── How it works ──────────────────────────────────── */}
          <section id="how-it-works" className="scroll-mt-20 border-y border-slate-900/[0.06] bg-white py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center" data-reveal>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-blue">Ridiculously simple</p>
                <h2 className="lp-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-brand-heading sm:text-5xl">
                  Organised by dinnertime.
                </h2>
              </div>

              <ol className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-3">
                {steps.map((step, i) => (
                  <li key={step.number} data-reveal style={{ transitionDelay: `${i * 110}ms` }} className="relative text-center md:text-left">
                    <span className="lp-display lp-gradient-text mx-auto block text-5xl font-extrabold tracking-tight md:mx-0">
                      {step.number}
                    </span>
                    <h3 className="lp-display mt-4 text-xl font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-brand-body">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>


          {/* ── Pricing ───────────────────────────────────────── */}
          <section id="pricing" className="scroll-mt-20 border-y border-slate-900/[0.06] bg-white py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center" data-reveal>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-purple">Simple pricing</p>
                <h2 className="lp-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-brand-heading sm:text-5xl">
                  Free for the everyday. One plan for everything.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-brand-body">
                  The price comparison alone typically saves more per week than the Family plan costs per month.
                </p>
              </div>

              <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
                <div data-reveal className="flex flex-col rounded-3xl border border-slate-900/[0.07] bg-white p-8">
                  <h3 className="lp-display text-xl font-bold">Free</h3>
                  <p className="mt-1 text-sm text-brand-body">Everything a household needs, forever.</p>
                  <p className="lp-display mt-5 text-4xl font-extrabold tracking-tight">€0</p>
                  <ul className="mt-6 flex-1 space-y-3 text-[15px] text-brand-body">
                    {[
                      'Shared shopping lists',
                      'Malta supermarket price comparison & offers',
                      'Meal planner with priced ingredients',
                      'Recurring chores for the whole clan',
                      'Shared notes',
                      'Unlimited household members',
                      'Medicine tracking for one child',
                    ].map(feature => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="mt-8 inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-6 py-3.5 text-base font-semibold text-brand-heading shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    Start free — no card needed
                  </button>
                </div>

                <div data-reveal style={{ transitionDelay: '100ms' }} className="relative flex flex-col rounded-3xl border-2 border-brand-purple/30 bg-white p-8 shadow-xl shadow-brand-purple/10">
                  <span className="absolute -top-3.5 left-8 rounded-full bg-gradient-to-r from-[#4D6BFF] to-[#7B61FF] px-3.5 py-1 text-xs font-bold text-white">
                    Pays for itself
                  </span>
                  <h3 className="lp-display text-xl font-bold">Family</h3>
                  <p className="mt-1 text-sm text-brand-body">Everything in Free, plus the money and health superpowers.</p>
                  <p className="lp-display mt-5 text-4xl font-extrabold tracking-tight">
                    €4.99<span className="text-lg font-semibold text-brand-muted">/month</span>
                  </p>
                  <p className="text-sm font-medium text-brand-body">or €49/year — two months free. VAT included.</p>
                  <ul className="mt-6 flex-1 space-y-3 text-[15px] text-brand-body">
                    {[
                      'Everything in Free',
                      'Shared finances — read-only open banking (BOV)',
                      'Subscription radar for recurring payments',
                      'AI spending insights',
                      'Medicine for unlimited children',
                      'Push reminders for doses',
                      'PDF health reports for the doctor',
                    ].map(feature => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" strokeWidth={3} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="lp-cta mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white"
                  >
                    Start free, upgrade in-app
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="mt-8 text-center text-sm text-brand-muted" data-reveal>
                Cancel anytime — your data stays and everything in Free keeps working.
              </p>
            </div>
          </section>

          {/* ── Privacy ───────────────────────────────────────── */}
          <section id="privacy" className="scroll-mt-20 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                <div data-reveal>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-teal">Privacy, properly</p>
                  <h2 className="lp-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-brand-heading sm:text-5xl">
                    Your family’s data sleeps at home too.
                  </h2>
                  <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-body">
                    Medicine schedules, bank transactions, kids’ health journals —
                    this is the most personal data a family has. ClanKeep’s answer
                    is simple: it never leaves your house.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4 text-[15px] font-semibold">
                    <Link href="/privacy" className="text-brand-blue underline decoration-brand-blue/30 decoration-2 underline-offset-4 transition-colors hover:text-brand-purple">
                      Read the Privacy Policy
                    </Link>
                    <Link href="/terms" className="text-brand-blue underline decoration-brand-blue/30 decoration-2 underline-offset-4 transition-colors hover:text-brand-purple">
                      Review the Terms
                    </Link>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-1">
                  {privacyPoints.map((point, i) => (
                    <div
                      key={point.title}
                      data-reveal
                      style={{ transitionDelay: `${i * 100}ms` }}
                      className="lp-card flex items-start gap-5 rounded-3xl border border-slate-900/[0.07] bg-white p-7"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                        <point.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="lp-display text-lg font-bold tracking-tight">{point.title}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-brand-body">{point.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Final CTA ─────────────────────────────────────── */}
          <section className="px-4 pb-24 sm:px-6 lg:px-8">
            <div
              data-reveal
              className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#4D6BFF] via-[#6A5CFF] to-[#7B61FF] px-6 py-20 text-center text-white sm:py-24"
            >
              <div aria-hidden="true" className="lp-grain opacity-40" />
              <div aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden="true" className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#2EE6C8]/20 blur-3xl" />

              <h2 className="lp-display relative mx-auto max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
                Bring your clan together tonight.
              </h2>
              <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
                One account, one invite link, and the whole household is finally on
                the same page — lists, medicines, money, and all.
              </p>
              <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-brand-blue shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4D6BFF]"
                >
                  Create your household
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-9 py-4 text-base font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Sign in
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-slate-900/[0.06] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
            <div>
              <Link href="/landing" className="inline-flex items-center">
                <BrandLogo />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-body">
                The self-hosted HQ for everything your household shares.
                Together. Organised. At home.
              </p>
            </div>

            <nav aria-label="Footer" className="flex flex-col gap-5 text-sm font-medium text-brand-body sm:flex-row sm:items-center">
              <a href="#features" className="transition-colors hover:text-brand-heading">Features</a>
              <a href="#prices" className="transition-colors hover:text-brand-heading">Price compare</a>
              <a href="#pricing" className="transition-colors hover:text-brand-heading">Pricing</a>
              <a href="#privacy" className="transition-colors hover:text-brand-heading">Privacy</a>
              <Link href="/privacy" className="transition-colors hover:text-brand-heading">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors hover:text-brand-heading">Terms</Link>
            </nav>
          </div>
          <div className="border-t border-slate-900/[0.06] px-4 py-6 text-center text-xs font-medium text-brand-muted">
            &copy; {new Date().getFullYear()} ClanKeep. All rights reserved.
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .lp {
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
        }
        .lp-display {
          font-family: var(--font-display), var(--font-body), ui-sans-serif, system-ui, sans-serif;
        }
        .lp-gradient-text {
          background: linear-gradient(120deg, #4d6bff 10%, #7b61ff 55%, #9d5cff 90%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .lp-cta {
          background: linear-gradient(135deg, #4d6bff, #7b61ff);
          box-shadow: 0 10px 28px -10px rgba(77, 107, 255, 0.55);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .lp-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -10px rgba(77, 107, 255, 0.6);
          filter: brightness(1.05);
        }
        .lp-cta:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #f7f8fd, 0 0 0 4px #4d6bff;
        }
        .lp-hero-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(560px 380px at 12% -8%, rgba(77, 107, 255, 0.14), transparent 65%),
            radial-gradient(640px 420px at 88% 4%, rgba(123, 97, 255, 0.13), transparent 65%),
            radial-gradient(520px 380px at 62% 96%, rgba(32, 197, 200, 0.1), transparent 65%);
          pointer-events: none;
        }
        .lp-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.5;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
        }
        .lp-card {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease;
        }
        .lp-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 48px -20px rgba(15, 23, 42, 0.18);
        }
        .lp-rise {
          opacity: 0;
          animation: lp-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes lp-rise {
          from {
            opacity: 0;
            transform: translateY(26px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lp [data-reveal] {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity 0.75s ease, transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp .lp-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-float {
          animation: lp-float 5.5s ease-in-out infinite;
        }
        .lp-float-slow {
          animation: lp-float 7s ease-in-out 1.2s infinite;
        }
        @keyframes lp-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-rise {
            animation: none;
            opacity: 1;
          }
          .lp [data-reveal] {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .lp-float,
          .lp-float-slow {
            animation: none;
          }
          .lp-card,
          .lp-cta {
            transition: none;
          }
        }
      `}</style>
    </>
  )
}
