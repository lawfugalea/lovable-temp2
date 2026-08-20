import Link from 'next/link'
import { BadgeCheck, LockKeyhole, Server } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

const points = [
  {
    icon: Server,
    title: 'Privately hosted, no big-tech clouds',
    description:
      'ClanKeep runs on our own servers with our own database — your family’s life is never sold, never used for advertising, and never becomes someone else’s dataset.',
  },
  {
    icon: LockKeyhole,
    title: 'Household-scoped by design',
    description:
      'Access is checked against authenticated household membership on every request — not bolted on afterwards.',
  },
  {
    icon: BadgeCheck,
    title: 'Honest about limits',
    description:
      'No system can promise absolute security, so we document exactly how data is handled and the choices you control.',
  },
]

export default function Privacy() {
  return (
    <Section id="privacy">
      <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-teal">Privacy, properly</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
            Private, like family matters should be.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Medicine schedules, kids’ health journals, family routines — this is
            the most personal data a family has. ClanKeep’s answer is simple: it
            is never sold, never mined for advertising, and never shared with
            anyone outside your household.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 text-[15px] font-semibold">
            <Link
              href="/privacy"
              className="text-primary underline decoration-primary/30 decoration-2 underline-offset-4 transition-colors hover:text-brand-purple"
            >
              Read the Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-primary underline decoration-primary/30 decoration-2 underline-offset-4 transition-colors hover:text-brand-purple"
            >
              Review the Terms
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-5">
          {points.map((point, i) => (
            <Reveal
              key={point.title}
              delay={i * 0.1}
              className="flex items-start gap-5 rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <point.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight text-foreground">{point.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{point.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
