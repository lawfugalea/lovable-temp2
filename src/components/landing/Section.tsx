import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Reveal from '@/components/landing/Reveal'

type SectionProps = {
  id?: string
  children: ReactNode
  className?: string
  /** Constrains and pads the inner content. Disable for full-bleed sections. */
  contain?: boolean
}

export function Section({ id, children, className, contain = true }: SectionProps) {
  return (
    <section id={id} className={cn('scroll-mt-24 py-20 sm:py-28', className)}>
      {contain ? <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div> : children}
    </section>
  )
}

type SectionHeadingProps = {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  /** Tailwind text colour class for the eyebrow, e.g. `text-brand-teal`. */
  eyebrowClassName?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  eyebrowClassName = 'text-primary',
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <p className={cn('text-sm font-bold uppercase tracking-[0.18em]', eyebrowClassName)}>{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
        {title}
      </h2>
      {lede && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{lede}</p>}
    </Reveal>
  )
}
