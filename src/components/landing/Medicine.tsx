import { BellRing, Check, FileText } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

const points = [
  'Every dose logged — who, when, how much. Free for one child, forever.',
  'Push reminders to every parent’s phone when a dose is due — Family plan',
  'Fever journal and a printable PDF report your paediatrician will actually thank you for',
]

export default function Medicine() {
  return (
    <Section id="medicine" className="overflow-hidden border-b border-border bg-card">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto w-full max-w-[520px]">
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-coral/15 via-brand-purple/10 to-transparent blur-3xl"
            />
            <div className="relative rounded-[1.75rem] border border-border bg-card p-1.5 shadow-soft-lg">
              <div className="rounded-[1.4rem] bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Health journal</p>
                    <p className="mt-0.5 font-display text-lg font-bold tracking-tight text-foreground">Nina · 4 years</p>
                  </div>
                  <span className="rounded-full bg-brand-coral/10 px-3 py-1 text-xs font-bold text-brand-coral">Antibiotics · day 3 of 7</span>
                </div>

                <div className="space-y-3 p-5">
                  <div className="rounded-2xl border border-brand-amber/40 bg-brand-amber/10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">Amoxicillin 250mg/5ml</p>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">5 ml · every 8 hours</p>
                      </div>
                      <span className="rounded-full bg-brand-amber px-3 py-1 text-xs font-bold text-white">Due now</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Last dose 10:15 — given by Maria</p>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-coral/10 text-brand-coral">
                        <BellRing className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Reminder sent to both phones</p>
                        <p className="text-xs text-muted-foreground">Sam &amp; Maria · 18:00</p>
                      </div>
                    </div>
                    <Check className="h-5 w-5 text-brand-teal" strokeWidth={3} aria-hidden="true" />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Fever journal</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">38.4° at 07:30 · 37.6° at 12:00 · 37.1° at 17:45</p>
                    </div>
                    <span className="text-xs font-bold text-brand-teal">Trending down</span>
                  </div>

                  <div
                    aria-hidden="true"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Export PDF report for the paediatrician
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="order-1 lg:order-2">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-coral">For the hard weeks</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
            When a child is sick, nobody should be doing maths at 3am.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            ClanKeep keeps the whole sick-week in one place: every dose logged
            with who gave it and when, timing checks taken from the actual
            packaging, and a fever journal that shows the trend at a glance —
            shared live between both parents, so nobody double-doses and nobody
            wakes the other to ask.
          </p>
          <ul className="mt-8 space-y-4 text-[15px] font-medium text-muted-foreground">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-coral" strokeWidth={3} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
