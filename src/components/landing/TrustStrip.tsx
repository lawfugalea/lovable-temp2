'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { BadgeCheck, FileText, LockKeyhole, Pill, ShieldCheck, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import InfiniteSlider from '@/components/smoothui/infinite-slider'

const stats = [
  { value: 5, suffix: '', label: 'supermarket catalogues compared' },
  { value: 24, suffix: 'h', label: 'automatic price refresh cycle' },
  { value: 1, suffix: '', label: 'shared home for every routine' },
  { value: 100, suffix: '%', label: 'private — never sold, never advertised' },
]

const proofChips: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShoppingBasket, label: 'Smart, Greens & Welbee’s catalogues priced daily' },
  { icon: ShieldCheck, label: 'No ads. No tracking. Never sold.' },
  { icon: Pill, label: 'Dose-by-dose medicine schedules' },
  { icon: FileText, label: 'PDF health reports for the doctor' },
  { icon: LockKeyhole, label: 'Household-scoped access on every request' },
  { icon: UtensilsCrossed, label: 'Weekly meal plans priced per store' },
  { icon: BadgeCheck, label: 'Free plan with unlimited members' },
]

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [inView, reduce, value])

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  )
}

export default function TrustStrip() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border px-4 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-8 text-center lg:py-10">
            <p className="font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              <CountUp value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mx-auto mt-2 max-w-[180px] text-sm font-medium leading-snug text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="relative border-t border-border py-5" aria-label="What ClanKeep stands for">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-card to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-card to-transparent"
        />
        <InfiniteSlider gap={12} speed={60} speedOnHover={18}>
          {proofChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              <chip.icon className="h-4 w-4 text-brand-teal" aria-hidden="true" />
              {chip.label}
            </span>
          ))}
        </InfiniteSlider>
      </div>
    </section>
  )
}
