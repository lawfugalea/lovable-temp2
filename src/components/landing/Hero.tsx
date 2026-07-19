'use client'

import { useState } from 'react'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BellRing, Check, HeartHandshake, Loader2, Pill, Sparkles } from 'lucide-react'

const checklist = [
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

const trustChips = ['Private by design', 'Whole family included', 'No ads, ever']

const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED === 'true'

const rise = (reduce: boolean, delay: number) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 26 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay },
      }

export default function Hero() {
  const router = useRouter()
  const reduce = useReducedMotion() ?? false
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoError, setDemoError] = useState('')

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
    <section className="relative overflow-hidden">
      {/* Ambient glow — breathes very slowly */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        {...(reduce
          ? {}
          : {
              animate: { opacity: [1, 0.75, 1], scale: [1, 1.04, 1] },
              transition: { duration: 14, repeat: Infinity, ease: 'easeInOut' as const },
            })}
        style={{
          background:
            'radial-gradient(560px 380px at 12% -8%, hsl(var(--brand-blue) / 0.14), transparent 65%), radial-gradient(640px 420px at 88% 4%, hsl(var(--brand-purple) / 0.13), transparent 65%), radial-gradient(520px 380px at 62% 96%, hsl(var(--brand-teal) / 0.10), transparent 65%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <motion.div
            {...rise(reduce, 0)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-card/70 px-3.5 py-1.5 text-[13px] font-semibold text-brand-purple shadow-soft-sm backdrop-blur"
          >
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            Together. Organised. At home.
          </motion.div>

          <motion.h1
            {...rise(reduce, 0.09)}
            className="mt-6 font-display text-[2.75rem] font-bold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.5rem]"
          >
            Everything your
            <br />
            home juggles.
            <br />
            One <span className="text-brand-purple">calm place</span>.
          </motion.h1>

          <motion.p {...rise(reduce, 0.18)} className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            ClanKeep brings the shopping list, the medicine schedule, the chore
            rota and the family budget into one private home — and tells you
            which Malta supermarket sells your basket cheapest this week.
          </motion.p>

          <motion.div {...rise(reduce, 0.27)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-8 py-4 text-base font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start your household — free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {demoEnabled && (
              <button
                type="button"
                onClick={() => void handleTryDemo()}
                disabled={demoBusy}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/5 px-8 py-4 text-base font-semibold text-brand-purple transition-all hover:-translate-y-0.5 hover:bg-brand-purple/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:opacity-60"
              >
                {demoBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {demoBusy ? 'Setting up your demo…' : 'Try the live demo'}
              </button>
            )}
          </motion.div>
          {demoError && <p className="mt-3 text-sm font-medium text-destructive">{demoError}</p>}

          <motion.div {...rise(reduce, 0.36)} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
            {trustChips.map((chip) => (
              <span key={chip} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                {chip}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Product mock */}
        <motion.div {...rise(reduce, 0.24)} className="relative mx-auto w-full max-w-[540px] lg:mx-0">
          <div
            aria-hidden="true"
            className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-blue/20 via-brand-purple/15 to-brand-teal/20 blur-3xl"
          />

          <div className="relative rounded-[1.75rem] border border-border bg-card p-1.5 shadow-soft-lg">
            <div className="rounded-[1.4rem] bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Saturday shop</p>
                  <p className="mt-0.5 font-display text-lg font-bold tracking-tight text-foreground">The Galea household</p>
                </div>
                <div className="flex -space-x-2.5" aria-label="Household members">
                  <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-card bg-brand-teal text-xs font-bold text-white">R</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-card bg-brand-coral text-xs font-bold text-white">S</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-card bg-brand-purple text-xs font-bold text-white">M</span>
                </div>
              </div>

              <ul className="px-5 py-3">
                {checklist.map((item, i) => (
                  <motion.li
                    key={item.name}
                    {...(reduce
                      ? {}
                      : {
                          initial: { opacity: 0, x: -12 },
                          animate: { opacity: 1, x: 0 },
                          transition: { delay: 0.5 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
                        })}
                    className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                        item.done ? 'border-brand-teal bg-brand-teal text-white' : 'border-border bg-card'
                      }`}
                    >
                      {item.done && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                    <span className={`flex-1 text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.name}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{item.store}</span>
                    <span className="w-12 text-right text-sm font-bold tabular-nums text-foreground">{item.price}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="mx-4 mb-4 rounded-2xl bg-brand-primary p-4 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Cheapest full basket</p>
                  <Sparkles className="h-4 w-4 text-white/80" aria-hidden="true" />
                </div>
                <div className="mt-2.5 space-y-2">
                  {storeBars.map((bar, i) => (
                    <div key={bar.store} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-semibold text-white/90">{bar.store}</span>
                      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                        <motion.span
                          {...(reduce
                            ? { style: { width: bar.width } }
                            : {
                                initial: { width: 0 },
                                animate: { width: bar.width },
                                transition: { delay: 0.9 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
                              })}
                          className={`absolute inset-y-0 left-0 rounded-full ${bar.cheapest ? 'bg-[#2EE6C8]' : 'bg-white/60'}`}
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
          <motion.div
            {...(reduce ? {} : { animate: { y: [0, -10, 0] }, transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const } })}
            className="absolute -left-4 top-20 hidden items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft-lg sm:flex lg:-left-14"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-coral/10 text-brand-coral">
              <Pill className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold leading-tight text-foreground">Mia’s antibiotics</p>
              <p className="text-xs font-medium text-muted-foreground">Reminder · today, 6:00 pm</p>
            </div>
          </motion.div>

          <motion.div
            {...(reduce
              ? {}
              : { animate: { y: [0, -10, 0] }, transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' as const, delay: 1.2 } })}
            className="absolute -bottom-6 -right-3 hidden items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft-lg sm:flex lg:-right-8"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <BellRing className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold leading-tight text-foreground">Netflix renews Friday</p>
              <p className="text-xs font-medium text-muted-foreground">Subscription radar · €13.99</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
