import Script from 'next/script'
import { useCookieConsent } from '@/lib/cookie-consent'

const agentId = process.env.NEXT_PUBLIC_KELMA_AGENT_ID

/**
 * Kelma AI chat bubble (https://kelma.chat) for visitor questions.
 * Renders nothing until NEXT_PUBLIC_KELMA_AGENT_ID is configured AND the
 * visitor has accepted non-essential cookies (the widget is a third-party
 * script that sets its own cookies).
 */
export default function KelmaWidget() {
  const { consent } = useCookieConsent()
  if (!agentId || consent !== 'accepted') return null
  return (
    <Script
      src="https://kelma.chat/embed.js"
      data-kelma={agentId}
      data-color="#4D6BFF"
      strategy="afterInteractive"
    />
  )
}
