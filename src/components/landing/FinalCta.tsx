'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import Reveal from '@/components/landing/Reveal'

export default function FinalCta() {
  const reduce = useReducedMotion() ?? false
  const drift = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { x: [0, 24, 0], y: [0, -18, 0] },
          transition: { duration: 16, repeat: Infinity, ease: 'easeInOut' as const, delay },
        }

  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-brand-primary px-6 py-20 text-center text-white sm:py-24">
        <motion.div aria-hidden="true" {...drift(0)} className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <motion.div aria-hidden="true" {...drift(4)} className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#2EE6C8]/20 blur-3xl" />

        <h2 className="relative mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
          Bring your clan together tonight.
        </h2>
        <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
          One account, one invite link, and the whole household is finally on
          the same page — lists, medicines, money, and all.
        </p>
        <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-brand-blue shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            Create your household
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-9 py-4 text-base font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
