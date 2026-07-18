import { useEffect } from 'react'
import { useTheme } from 'next-themes'

const LIGHT = '#4D6BFF'
const DARK = '#0F172A'

/** Keeps the browser-chrome theme colour in step with the active theme. */
export default function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = resolvedTheme === 'dark' ? DARK : LIGHT
  }, [resolvedTheme])

  return null
}
