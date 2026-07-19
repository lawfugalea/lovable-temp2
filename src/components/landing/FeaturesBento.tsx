import { CalendarCheck2, Check, Landmark, NotebookPen, Pill, ShoppingBasket, UsersRound, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

type Tone = 'teal' | 'coral' | 'blue' | 'purple' | 'amber' | 'green'

const toneStyles: Record<Tone, { chip: string; icon: string; halo: string }> = {
  teal: { chip: 'bg-brand-teal/10', icon: 'text-brand-teal', halo: 'bg-brand-teal/10' },
  coral: { chip: 'bg-brand-coral/10', icon: 'text-brand-coral', halo: 'bg-brand-coral/10' },
  blue: { chip: 'bg-brand-blue/10', icon: 'text-brand-blue', halo: 'bg-brand-blue/10' },
  purple: { chip: 'bg-brand-purple/10', icon: 'text-brand-purple', halo: 'bg-brand-purple/10' },
  amber: { chip: 'bg-brand-amber/10', icon: 'text-brand-amber', halo: 'bg-brand-amber/10' },
  green: { chip: 'bg-brand-green/10', icon: 'text-brand-green', halo: 'bg-brand-green/10' },
}

type Feature = {
  icon: LucideIcon
  tone: Tone
  title: string
  description: string
  bullets?: string[]
  tags?: string[]
  wide?: boolean
}

const features: Feature[] = [
  {
    icon: ShoppingBasket,
    tone: 'teal',
    wide: true,
    title: 'One list. Every store priced.',
    description:
      'Anyone in the household adds items; ClanKeep prices the list across Malta’s supermarket catalogues and highlights the cheapest full basket. Tick items off in the aisle — the list updates live for everyone.',
    tags: ['Shared in real time', 'Malta price comparison', 'Cheapest-basket totals', 'Curated offers'],
  },
  {
    icon: UtensilsCrossed,
    tone: 'amber',
    title: 'Dinner, decided.',
    description:
      'Plan Monday to Sunday from your own recipes, then add the whole week to the shopping list in one tap — priced per store.',
    bullets: ['Weekly planner', 'One-tap shopping list', 'Plan priced per store'],
  },
  {
    icon: Pill,
    tone: 'coral',
    wide: true,
    title: 'A medicine cabinet with a memory.',
    description:
      'Courses, doses and schedules for every member of the house — with push reminders so 6 pm antibiotics never depend on anyone’s memory. Fever journals and printable PDF reports keep the doctor in the loop.',
    tags: ['Dose-by-dose schedules', 'Push reminders', 'Fever journal', 'PDF doctor reports'],
  },
  {
    icon: CalendarCheck2,
    tone: 'green',
    title: 'The rota that runs itself.',
    description:
      'Recurring chores that appear on the right day, tick off in one tap, and keep a shared log of who did what.',
    bullets: ['Recurring schedules', 'One-tap check-off', 'Shared completion log'],
  },
  {
    icon: Landmark,
    tone: 'blue',
    title: 'A money planner with an AI coach.',
    description:
      'Income, outgoings, budgets and savings goals in one view — with an AI coach that studies only redacted totals and suggests how to hit your goals sooner.',
    bullets: ['Budgets & savings goals', 'AI savings coach', 'Only redacted totals analysed'],
  },
  {
    icon: NotebookPen,
    tone: 'purple',
    title: 'Notes that behave like notes.',
    description:
      'A proper rich-text editor — headings, tables, images, checklists. Pin the boiler code, the babysitter brief, the Wi-Fi password.',
    bullets: ['Rich editor with tables & images', 'Pinned essentials', 'Shared with the household'],
  },
  {
    icon: UsersRound,
    tone: 'teal',
    title: 'The whole clan, one invite away.',
    description:
      'Invite partners, kids, grandparents by email or link. Everyone lands in the same shared home — no setup wizard to wrestle.',
    bullets: ['Email & link invitations', 'Unlimited members on Free', 'Admin panel included'],
  },
]

export default function FeaturesBento() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Everything a home juggles"
        eyebrowClassName="text-brand-purple"
        title={
          <>
            Five apps’ worth of chaos.
            <br />
            One calm HQ.
          </>
        }
        lede="The shopping app, the pill reminder, the chore rota, the notes app, and the group chat that glues them together — replaced by one place the whole household actually shares."
      />

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const tone = toneStyles[feature.tone]
          return (
            <Reveal
              key={feature.title}
              delay={(i % 3) * 0.09}
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg',
                feature.wide && 'md:col-span-2',
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  'absolute -right-20 -top-20 h-64 w-64 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-125',
                  tone.halo,
                )}
              />
              <span className={cn('relative grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none', tone.chip, tone.icon)}>
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="relative mt-6 font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {feature.title}
              </h3>
              <p className="relative mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{feature.description}</p>

              {feature.tags && (
                <ul className="relative mt-6 flex flex-wrap gap-2">
                  {feature.tags.map((tag) => (
                    <li key={tag} className="rounded-full bg-muted px-3.5 py-1.5 text-[13px] font-semibold text-muted-foreground">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}

              {feature.bullets && (
                <ul className="relative mt-5 space-y-2">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                      <Check className={cn('h-4 w-4 shrink-0', tone.icon)} strokeWidth={3} aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
