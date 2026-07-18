import Script from 'next/script'

const agentId = process.env.NEXT_PUBLIC_KELMA_AGENT_ID

/**
 * Kelma AI chat bubble (https://kelma.chat) for visitor questions.
 * Renders nothing until NEXT_PUBLIC_KELMA_AGENT_ID is configured.
 */
export default function KelmaWidget() {
  if (!agentId) return null
  return (
    <Script
      src="https://kelma.chat/embed.js"
      data-kelma={agentId}
      data-color="#4D6BFF"
      strategy="afterInteractive"
    />
  )
}
