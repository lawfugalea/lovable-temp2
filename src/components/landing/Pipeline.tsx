import { CalendarDays, MessageCircleHeart, ShoppingBasket, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

const upcoming: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: ShoppingBasket,
    title: 'Smarter shared lists',
    description: 'Quicker repeat shops and better suggestions based on the lists your household chooses to reuse.',
  },
  {
    icon: CalendarDays,
    title: 'A family calendar',
    description: 'School runs, appointments and pickups — shared with the household like everything else.',
  },
  {
    icon: MessageCircleHeart,
    title: 'A more helpful Kelma',
    description: 'Our AI helper moving beyond answering questions — helping plan the week, the meals and the budget.',
  },
]

export default function Pipeline() {
  return (
    <Section id="pipeline" className="border-y border-border bg-card">
      <SectionHeading
        eyebrow="In the pipeline"
        eyebrowClassName="text-brand-amber"
        title="And we're just getting started."
        lede="ClanKeep ships improvements regularly, shaped by what real households ask for. Here's what we're working on — no dates promised, released when it's genuinely ready."
        align="center"
      />

      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
        {upcoming.map((item, i) => (
          <Reveal
            key={item.title}
            delay={i * 0.1}
            className="relative rounded-3xl border border-dashed border-border bg-background p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-solid hover:shadow-soft"
          >
            <span className="absolute right-4 top-4 flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-amber/60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-amber" />
            </span>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-amber/10 text-brand-amber">
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-brand-amber" aria-hidden="true" />
        Every household on the Free plan gets these updates too — no upgrade needed to grow with us.
      </Reveal>
    </Section>
  )
}
