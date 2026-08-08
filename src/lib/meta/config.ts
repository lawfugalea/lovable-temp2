/**
 * Meta measurement configuration.
 *
 * Two halves that can be enabled independently, because they fail differently:
 * the browser pixel needs a public id and is blocked by ad blockers and iOS
 * tracking prevention, while the Conversions API runs from our own routes and
 * survives both. Running only the server side is a legitimate configuration.
 */

/** Readable in the browser; a pixel id is public by nature. */
export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || null

export function isBrowserPixelConfigured(): boolean {
  return Boolean(metaPixelId)
}

export type MetaServerConfig = {
  pixelId: string
  accessToken: string
  /** Routes events to Meta's test console instead of live reporting. */
  testEventCode: string | null
  apiVersion: string
}

/**
 * Server-side configuration, or null when Conversions API is not set up. The
 * access token is a system-user credential and must never reach the client, so
 * it is deliberately read from a non-`NEXT_PUBLIC_` variable.
 */
export function metaServerConfig(): MetaServerConfig | null {
  const pixelId = process.env.META_PIXEL_ID?.trim() || metaPixelId
  const accessToken = process.env.META_CONVERSIONS_TOKEN?.trim()
  if (!pixelId || !accessToken) return null
  return {
    pixelId,
    accessToken,
    testEventCode: process.env.META_TEST_EVENT_CODE?.trim() || null,
    apiVersion: process.env.META_API_VERSION?.trim() || 'v21.0',
  }
}
