import { createHash, timingSafeEqual } from 'node:crypto';

export function passwordVersion(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('base64url');
}

export function isPasswordVersionCurrent(version: unknown, passwordHash: string): boolean {
  if (typeof version !== 'string') return false;
  const expected = Buffer.from(passwordVersion(passwordHash));
  const actual = Buffer.from(version);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
