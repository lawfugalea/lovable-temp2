'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Stagger delay in seconds. */
  delay?: number
  /** Slide distance in px. */
  y?: number
  as?: 'div' | 'section' | 'li' | 'figure' | 'article'
}

/**
 * Scroll-triggered rise+fade. Replaces the old IntersectionObserver `useReveal`
 * hook with a motion primitive that respects prefers-reduced-motion.
 */
export default function Reveal({ children, className, delay = 0, y = 24, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as]

  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  )
}
