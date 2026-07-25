import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { AnchorRect } from './resolve-anchor'
import type { TourStep } from '@/lib/onboarding-tour'

export interface TourCardProps {
  step: TourStep
  /** Copy already resolved for the current breakpoint. */
  body: string
  position: { index: number; total: number }
  /** Null when the step is unanchored, or its anchor could not be resolved. */
  rect: AnchorRect | null
  /** Below `sm` the card is a fixed bottom sheet and only the spotlight moves. */
  compact: boolean
  canGoBack: boolean
  isLastStep: boolean
  onNext: () => void
  onBack: () => void
  onPause: () => void
  onFinish: () => void
}

/** Shared body of the card in both presentations. */
function CardBody({
  step, body, position, titleId, bodyId, headingRef, canGoBack, isLastStep, onNext, onBack, onPause, onFinish,
}: TourCardProps & { titleId: string; bodyId: string; headingRef: React.RefObject<HTMLDivElement> }) {
  return (
    <>
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
          Step {position.index} of {position.total}
        </p>
        <h2 id={titleId} className="mt-1 font-display text-base font-bold tracking-tight">
          {step.title}
        </h2>
      </div>
      <p id={bodyId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onPause} className="-ml-2 text-muted-foreground">
          Skip
        </Button>
        <div className="flex-1" />
        {canGoBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        )}
        <Button size="sm" onClick={isLastStep ? onFinish : onNext}>
          {isLastStep ? 'Finish' : 'Next'}
        </Button>
      </div>
    </>
  )
}

export default function TourCard(props: TourCardProps) {
  const { step, rect, compact, onPause } = props
  const titleId = useId()
  const bodyId = useId()
  const headingRef = useRef<HTMLDivElement>(null)

  // Move focus to the step heading on every change: it announces the new step
  // without stealing focus back from Next on repeated presses.
  useEffect(() => {
    const timer = window.setTimeout(() => headingRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [step.id])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      props.isLastStep ? props.onFinish() : props.onNext()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (props.canGoBack) props.onBack()
    }
  }

  const body = <CardBody {...props} titleId={titleId} bodyId={bodyId} headingRef={headingRef} />

  if (compact) {
    return (
      <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onPause() }}>
        <DialogPrimitive.Portal>
          {/* Transparent: the spotlight ring already dims the page, and a second
              scrim here would hide the very thing the step is pointing at. */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-transparent" />
          <DialogPrimitive.Content
            onKeyDown={handleKeyDown}
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className={cn(
              'fixed inset-x-0 z-[70] border-t bg-background p-5 shadow-soft-lg',
              'rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]',
              // Sit above the 56px bottom tab bar rather than covering it — the
              // nav step points straight at it.
              'bottom-[calc(3.5rem+var(--keyboard-inset,0px))]',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4',
            )}
          >
            <DialogPrimitive.Title className="sr-only">{step.title}</DialogPrimitive.Title>
            {body}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }

  return (
    <Popover open modal onOpenChange={(open) => { if (!open) onPause() }}>
      {/* A zero-size element parked at the measured rect, so any element can be
          an anchor without having to be a Radix trigger. */}
      <PopoverAnchor asChild>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed"
          style={rect
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            : { top: '50%', left: '50%', width: 0, height: 0 }}
        />
      </PopoverAnchor>
      <PopoverContent
        side={rect ? (step.side ?? 'bottom') : 'bottom'}
        align="center"
        sideOffset={12}
        collisionPadding={16}
        onKeyDown={handleKeyDown}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-[70] w-[min(22rem,calc(100vw-2rem))] shadow-soft-lg"
      >
        {body}
      </PopoverContent>
    </Popover>
  )
}
