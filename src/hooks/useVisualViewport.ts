import { useEffect } from 'react'

/**
 * Publishes the visual viewport to CSS.
 *
 * On phones the on-screen keyboard shrinks the *visual* viewport but leaves the
 * *layout* viewport alone, and `position: fixed` overlays are placed against the
 * layout viewport. Without this, a dialog pinned to `bottom: 0` sits behind the
 * keyboard — footer buttons first — and `dvh` does not help, because it tracks
 * retracting browser chrome rather than the keyboard.
 *
 * Exposes on the document element:
 * - `--viewport-height`: height actually visible to the user
 * - `--viewport-offset-top`: distance the visual viewport is scrolled down
 * - `--keyboard-inset`: space the keyboard covers at the bottom, else 0px
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      // The viewport fires a burst of events while the keyboard animates; one
      // write per frame keeps this off the layout-thrash path.
      frame = requestAnimationFrame(() => {
        const style = document.documentElement.style
        const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        style.setProperty('--viewport-height', `${Math.round(viewport.height)}px`)
        style.setProperty('--viewport-offset-top', `${Math.round(viewport.offsetTop)}px`)
        // Below ~80px it is browser chrome, not a keyboard; pinning to it makes
        // overlays jitter as the URL bar collapses on scroll.
        style.setProperty('--keyboard-inset', `${inset > 80 ? Math.round(inset) : 0}px`)
      })
    }

    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
    }
  }, [])
}
