import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { ArrowRight, Compass, HelpCircle, ListChecks, Mail, Search } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import { useTour } from '@/components/onboarding/TourProvider'
import { modules } from '@/lib/modules'
import { faqsFor, generalHelpTopics, moduleHelp, type ModuleHelp } from '@/lib/help-content'
import { getPublicLegalConfig } from '@/lib/public-legal'
import { cn } from '@/lib/utils'

interface HelpPageProps {
  contactEmail: string
  contactConfigured: boolean
}

export const getServerSideProps: GetServerSideProps<HelpPageProps> = async () => {
  const config = getPublicLegalConfig()
  return { props: { contactEmail: config.contactEmail, contactConfigured: config.contactConfigured } }
}

/** Everything a section can match on, lower-cased once per render. */
function haystackFor(help: ModuleHelp, name: string): string {
  return [name, help.tagline, help.summary, help.regionNote ?? '', ...help.keywords, ...help.capabilities]
    .join(' ')
    .toLowerCase()
}

export default function HelpPage({ contactEmail, contactConfigured }: HelpPageProps) {
  const [query, setQuery] = useState('')
  const onboarding = useOnboarding()
  const tour = useTour()

  const entitlements = onboarding?.state?.entitlements ?? null
  const checklistDismissed = onboarding?.state?.user.checklistDismissedAt != null
  const hasHousehold = onboarding?.state?.household != null

  const needle = query.trim().toLowerCase()

  const visibleModules = useMemo(() => {
    const withHelp = modules.map((module) => ({ module, help: moduleHelp[module.key] }))
    if (!needle) return withHelp
    return withHelp.filter(({ module, help }) => haystackFor(help, module.name).includes(needle))
  }, [needle])

  const visibleTopics = useMemo(() => {
    if (!needle) return generalHelpTopics
    return generalHelpTopics.filter((topic) =>
      [topic.title, topic.summary, ...topic.points].join(' ').toLowerCase().includes(needle),
    )
  }, [needle])

  const visibleFaqs = useMemo(() => {
    const faqs = faqsFor('app')
    if (!needle) return faqs
    return faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(needle))
  }, [needle])

  const nothingMatched = needle !== '' && visibleModules.length === 0 && visibleTopics.length === 0 && visibleFaqs.length === 0

  /** True when the household's plan does not cover this area. */
  const isLocked = (help: ModuleHelp): boolean => {
    if (!help.requiresFeature || !entitlements) return false
    switch (help.requiresFeature) {
      case 'finance': return !entitlements.canUseFinance
      case 'ai': return !entitlements.canUseAi
      case 'pushReminders': return !entitlements.canUsePushReminders
      case 'medicinePdf': return !entitlements.canExportMedicinePdf
      case 'children': return !entitlements.unlimitedChildren
      case 'priceComparison': return !entitlements.canUsePriceComparison
      default: return false
    }
  }

  return (
    <ModernAppShell title="Help">
      <div className="space-y-8 pb-4">
        <section className="rounded-2xl border bg-card px-6 py-7 shadow-soft-sm sm:px-8 sm:py-9">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden="true" /> Help
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How ClanKeep works</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            What each area is for, what your plan covers, and answers to the questions
            people ask most. Everything here is about the app — it never looks at your household&apos;s data.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help…"
                aria-label="Search help"
                className="pl-9"
              />
            </div>
            {tour && hasHousehold && (
              <Button variant="outline" onClick={() => void tour.startTour()}>
                <Compass className="h-4 w-4" /> Take the 90-second tour
              </Button>
            )}
            {checklistDismissed && hasHousehold && (
              <Button
                variant="outline"
                onClick={() => void onboarding?.update({ checklistDismissed: false }).catch(() => {})}
              >
                <ListChecks className="h-4 w-4" /> Show the getting-started checklist
              </Button>
            )}
          </div>
        </section>

        {nothingMatched && (
          <Alert>
            <AlertDescription>
              Nothing here matches &ldquo;{query.trim()}&rdquo;.{' '}
              <button type="button" className="font-medium underline" onClick={() => setQuery('')}>
                Clear the search
              </button>{' '}
              to see everything.
            </AlertDescription>
          </Alert>
        )}

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Help contents" className="hidden lg:block">
            <div className="sticky top-[88px] space-y-1">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                On this page
              </p>
              {visibleModules.map(({ module }) => (
                <a
                  key={module.key}
                  href={`#${module.key}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {module.name}
                </a>
              ))}
              {visibleTopics.map((topic) => (
                <a
                  key={topic.id}
                  href={`#${topic.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {topic.title}
                </a>
              ))}
              {visibleFaqs.length > 0 && (
                <a
                  href="#faq"
                  className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Common questions
                </a>
              )}
            </div>
          </nav>

          <div className="min-w-0 space-y-6">
            {visibleModules.map(({ module, help }) => {
              const Icon = module.icon
              const locked = isLocked(help)
              return (
                <section
                  key={module.key}
                  id={module.key}
                  aria-labelledby={`${module.key}-heading`}
                  className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', module.tileClass)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 id={`${module.key}-heading`} className="font-display text-lg font-bold tracking-tight">
                          {module.name}
                        </h3>
                        {help.requiresFeature && (
                          <Badge variant={locked ? 'secondary' : 'outline'}>Family plan</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{help.summary}</p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {help.capabilities.map((capability) => (
                      <li key={capability} className="flex gap-2.5 text-sm leading-relaxed">
                        <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', module.barClass)} aria-hidden="true" />
                        <span className="text-muted-foreground">{capability}</span>
                      </li>
                    ))}
                  </ul>

                  {help.regionNote && (
                    <p className="mt-3 text-xs text-muted-foreground">{help.regionNote}</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {locked ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/settings?tab=billing">See the Family plan <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href={module.href}>Open {module.name} <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    )}
                  </div>
                </section>
              )
            })}

            {visibleTopics.map((topic) => (
              <section
                key={topic.id}
                id={topic.id}
                aria-labelledby={`${topic.id}-heading`}
                className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6"
              >
                <h3 id={`${topic.id}-heading`} className="font-display text-lg font-bold tracking-tight">
                  {topic.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
                <ul className="mt-4 space-y-2">
                  {topic.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
                {topic.href && (
                  <div className="mt-5">
                    <Button asChild variant="outline" size="sm">
                      <Link href={topic.href}>{topic.hrefLabel ?? 'Open'} <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                )}
              </section>
            ))}

            {visibleFaqs.length > 0 && (
              <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6">
                <h3 id="faq-heading" className="font-display text-lg font-bold tracking-tight">Common questions</h3>
                <Accordion type="single" collapsible className="mt-2 w-full">
                  {visibleFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left text-[15px] font-semibold">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            <section aria-labelledby="contact-heading" className="rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6">
              <h3 id="contact-heading" className="font-display text-lg font-bold tracking-tight">Still stuck?</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {contactConfigured
                  ? 'If none of the above covers it, get in touch and tell us what you were trying to do.'
                  : 'This deployment has not published a support address. The privacy page lists who operates it and how to reach them.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {contactConfigured && (
                  <Button asChild size="sm">
                    <a href={`mailto:${contactEmail}`}><Mail className="h-4 w-4" /> Email support</a>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href="/privacy">Privacy</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/terms">Terms</Link>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ModernAppShell>
  )
}
