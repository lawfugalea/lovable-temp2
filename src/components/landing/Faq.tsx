import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'

const faqs = [
  {
    question: 'Is ClanKeep really free?',
    answer:
      'Yes. The Free plan is free forever — shared shopping lists, meal planning, chores, notes, unlimited household members, and medicine tracking for one child. No card, no trial clock. The Family plan (€4.99/month or €49/year) adds the Malta price comparison, the money planner with AI coach, unlimited children in medicine, push dose reminders, and PDF health reports.',
  },
  {
    question: 'How does the supermarket price comparison work?',
    answer:
      'ClanKeep reads the public online catalogues of Malta’s supermarkets — Smart, Greens, Welbee’s and more — refreshed automatically every day. It prices your actual shopping list at each store and totals the basket, highlighting the cheapest. Prices older than 48 hours are flagged, never silently used. Totals are honest planning estimates: in-store branch prices and delivery fees can differ.',
  },
  {
    question: 'Where does my family’s data live?',
    answer:
      'On our own privately hosted servers with our own database — not on big-tech clouds. Your household’s data is never sold, never used for advertising, and never shared outside your household. Access is checked against authenticated household membership on every request.',
  },
  {
    question: 'What does the AI savings coach actually see?',
    answer:
      'Only redacted totals from your money planner — no bank logins, no transaction descriptions, no names. It looks at the shape of your plan (income, outgoings, goals) and suggests how to reach your savings goals sooner. There is no open-banking connection to set up.',
  },
  {
    question: 'Does it work outside Malta?',
    answer:
      'Everything works anywhere — shopping lists, meals, chores, medicine, money planner, notes. The supermarket price comparison is built specifically on Maltese supermarket catalogues, so that feature is most useful if you shop in Malta.',
  },
  {
    question: 'What happens if I cancel the Family plan?',
    answer:
      'You keep your account and all your data, and everything in the Free plan keeps working. You only lose the paid extras — price comparison, AI coach, multi-child medicine, push dose reminders and PDF reports — until you resubscribe.',
  },
]

export default function Faq() {
  return (
    <Section id="faq">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Questions, answered"
          eyebrowClassName="text-brand-blue"
          title="Everything families ask before joining."
          align="center"
        />

        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left font-display text-base font-bold text-foreground sm:text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  )
}
