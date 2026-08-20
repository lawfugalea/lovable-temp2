/**
 * Minimal, dependency-free error capture.
 *
 * Emits a single-line structured JSON record so any log aggregator (Loki,
 * Datadog, a Sentry log drain, `docker logs | jq`, ...) can parse and alert on
 * production errors — the app previously only wrote free-text console.error.
 *
 * To forward to Sentry: set SENTRY_DSN, install `@sentry/nextjs`, and call
 * `Sentry.captureException(error)` from here. Kept behind this one function so
 * that wiring lives in a single place.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const record = {
    tag: 'clankeep-error',
    level: 'error',
    time: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  }
  try {
    console.error(`[clankeep-error] ${JSON.stringify(record)}`)
  } catch {
    // Fallback if the payload can't be serialised (circular refs etc.).
    console.error('[clankeep-error]', record.message, error)
  }
}
