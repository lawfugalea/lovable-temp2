import { createHash, timingSafeEqual } from 'node:crypto'

export function hashMobileRefreshToken(value: string): string {
  return createHash('sha256').update(value).digest('base64url')
}

export function mobileRefreshSessionId(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 256) return null
  const separator = value.indexOf('.')
  if (separator < 1 || separator === value.length - 1) return null
  const id = value.slice(0, separator)
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : null
}

export function mobileRefreshTokenMatches(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashMobileRefreshToken(value))
  const expected = Buffer.from(expectedHash)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
