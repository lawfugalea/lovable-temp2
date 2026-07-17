import { createHash, randomBytes } from 'crypto';

export function createInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function normalizeInviteToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || token.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(token)) return null;
  return token;
}
