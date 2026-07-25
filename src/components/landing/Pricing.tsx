'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

const freeFeatures = [
  'Shared shopping lists the whole clan updates live',
  'Meal planner with one-tap shopping lists',
  'Recurring chores for the whole clan',
  'Shared notes',
  'Unlimited household members',
  'Medicine tracking for one child',
]

const familyFeatures = [
  'Everything in Free',
  'Money planner with AI savings coach',
  'Medicine for unlimited children',
  'Push reminders for doses',
  'PDF health reports for the doctor',
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <Section id="pricing" className="border-y border-border bg-card">
      <SectionHeading
        eyebrow="Simple pricing"
        eyebrowClassName="text-brand-purple"
        title="Free for the everyday. One plan for everything."
        lede="Start with the household essentials for free, then add the money and health tools when you need them."
        align="center"
      />

      <Reveal className="mt-10 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-background p-1 text-sm font-semibold" role="group" aria-label="Billing period">
          <button
            type="button"
            onClick={() => setYearly(false)}
            aria-pressed={!yearly}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              !yearly ? 'bg-brand-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            aria-pressed={yearly}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              yearly ? 'bg-brand-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Yearly <span className={cn('ml-1 text-xs font-bold', yearly ? 'text-white/80' : 'text-brand-teal')}>2 months free</span>
          </button>
        </div>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-2">
        <Reveal className="flex flex-col rounded-3xl border border-border bg-background p-8">
          <h3 className="font-display text-xl font-bold text-foreground">Free</h3>
          <p className="mt-1 text-sm text-muted-foreground">Everything a household needs, forever.</p>
          <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground">€0</p>
          <p className="text-sm font-medium text-muted-foreground">No card needed. No trial clock.</p>
          <ul className="mt-6 flex-1 space-y-3 text-[15px] text-muted-foreground">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground shadow-soft-sm transition-all hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start free
          </Link>
        </Reveal>

        <Reveal delay={0.1} className="relative flex flex-col rounded-3xl border-2 border-brand-purple/30 bg-background p-8 shadow-soft-lg">
          <span className="absolute -top-3.5 left-8 rounded-full bg-brand-primary px-3.5 py-1 text-xs font-bold text-white">
            Best value
          </span>
          <h3 className="font-display text-xl font-bold text-foreground">Family</h3>
          <p className="mt-1 text-sm text-muted-foreground">Everything in Free, plus the money and health superpowers.</p>
          <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground">
            {yearly ? '€49' : '€4.99'}
            <span className="text-lg font-semibold text-muted-foreground">{yearly ? '/year' : '/month'}</span>
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {yearly ? 'Works out at €4.08/month. VAT included.' : 'Or €49/year — two months free. VAT included.'}
          </p>
          <ul className="mt-6 flex-1 space-y-3 text-[15px] text-muted-foreground">
            {familyFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" strokeWidth={3} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Start free, upgrade in-app
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>

      <Reveal className="mt-8 text-center text-sm text-muted-foreground">
        Cancel anytime — your data stays and everything in Free keeps working.
      </Reveal>
    </Section>
  )
}
