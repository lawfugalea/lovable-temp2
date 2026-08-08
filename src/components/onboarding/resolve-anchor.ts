/**
 * Finds the DOM node a tour step should point at.
 *
 * The same logical target exists as several different elements at different
 * breakpoints — "the navigation" is the full sidebar on a laptop, a 76px icon
 * rail on a tablet, and the bottom tab bar on a phone, plus the drawer inside a
 * closed Sheet. Rather than teaching every step three selectors, all of them
 * carry the same `data-tour` value and we pick whichever one is actually on
 * screen. The shell guarantees exactly one is visible at a time.
 */

/**
 * A node inside a `display: none` ancestor reports no client rects, which is
 * what makes the first-visible-wins approach work for the hidden breakpoint
 * variants and for nav inside a closed Sheet.
 */
function isVisible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false
  const style = getComputedStyle(element)
  return style.visibility !== 'hidden' && style.opacity !== '0'
}

export function resolveAnchor(target: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const selector = `[data-tour="${CSS.escape(target)}"]`
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector))
  return nodes.find(isVisible) ?? null
}

/**
 * Resolve with a short retry window. An anchor can be a frame or two late —
 * Radix portals mount asynchronously, the checklist waits on a fetch, and the
 * dashboard's entry animation runs on mount.
 */
export function resolveAnchorWithRetry(
  target: string,
  timeoutMs = 600,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    const attempt = () => {
      const found = resolveAnchor(target)
      if (found || Date.now() >= deadline) {
        resolve(found)
        return
      }
      requestAnimationFrame(attempt)
    }
    attempt()
  })
}

export interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/** Viewport-relative rect, padded so the highlight does not crop the element. */
export function measure(element: HTMLElement, padding = 6): AnchorRect {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}
