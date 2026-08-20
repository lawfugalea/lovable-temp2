import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Section, SectionHeading } from '@/components/landing/Section'
import Reveal from '@/components/landing/Reveal'
import { faqsFor } from '@/lib/help-content'

// Shared with the in-app help centre so marketing and /help cannot drift apart.
const faqs = faqsFor('public')

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
              <AccordionItem key={faq.id} value={faq.id}>
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
