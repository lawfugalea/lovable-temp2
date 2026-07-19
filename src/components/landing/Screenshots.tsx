import Image from 'next/image'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'
import shotDashboard from '@/assets/marketing/dashboard.jpg'
import shotCompare from '@/assets/marketing/compare.jpg'
import shotMeals from '@/assets/marketing/meals.jpg'
import shotChores from '@/assets/marketing/chores.jpg'

const shots = [
  {
    image: shotDashboard,
    alt: 'ClanKeep dashboard showing the household overview',
    title: 'Your household at a glance',
    caption: 'Tonight’s dinner, today’s chores, and the next shop — one calm overview for the whole clan.',
  },
  {
    image: shotCompare,
    alt: 'Shopping list priced across Malta supermarkets',
    title: 'Where is this list cheapest?',
    caption: 'Your actual list priced item-by-item per supermarket, cheapest basket highlighted. Family plan.',
  },
  {
    image: shotMeals,
    alt: 'Weekly meal planner',
    title: 'Dinner, decided',
    caption: 'Plan Monday to Sunday from your own recipes, then add the whole week to the shopping list in one tap.',
  },
  {
    image: shotChores,
    alt: 'Recurring chores with one-tap check-off',
    title: 'The rota that runs itself',
    caption: 'Recurring chores that appear on the right day, tick off in one tap, and keep a shared log.',
  },
]

export default function Screenshots() {
  return (
    <Section id="tour">
      <SectionHeading
        eyebrow="See it in action"
        eyebrowClassName="text-brand-teal"
        title="The calm is real. Here’s the app."
        lede="Actual screens from ClanKeep — no mock-ups, no promises. This is what your household sees."
        align="center"
      />

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {shots.map((shot, index) => (
          <Reveal as="figure" key={shot.title} delay={(index % 2) * 0.1} className="group">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-transform duration-500 group-hover:-translate-y-1">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-coral/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-teal/70" />
                <span className="ml-3 truncate text-xs font-medium text-muted-foreground">clankeep.com</span>
              </div>
              <Image
                src={shot.image}
                alt={shot.alt}
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:transform-none"
                sizes="(min-width: 1024px) 590px, 100vw"
              />
            </div>
            <figcaption className="mt-4 px-1">
              <p className="font-display text-lg font-bold text-foreground">{shot.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{shot.caption}</p>
            </figcaption>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
