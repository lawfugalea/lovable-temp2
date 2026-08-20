import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

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
    description: 'Shopping lists, medicine schedules, chores, and the notes your home actually uses.',
  },
]

export default function HowItWorks() {
  return (
    <Section id="how-it-works" className="border-y border-border bg-card">
      <SectionHeading
        eyebrow="Ridiculously simple"
        eyebrowClassName="text-brand-blue"
        title="Organised by dinnertime."
        align="center"
      />

      <ol className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.number} delay={i * 0.11} className="relative text-center md:text-left">
            <span className="mx-auto block font-display text-5xl font-extrabold tracking-tight text-primary/25 md:mx-0">
              {step.number}
            </span>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">{step.title}</h3>
            <p className="mt-2.5 leading-relaxed text-muted-foreground">{step.description}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
