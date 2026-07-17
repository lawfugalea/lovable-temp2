import type { NextApiRequest, NextApiResponse } from 'next';

const loginAttemptStore = new Map<string, { count: number; resetTime: number }>();
const inviteEmailAttemptStore = new Map<string, { count: number; resetTime: number }>();
const MAX_TRACKED_KEYS = 10_000;

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => getClientIP(req),
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;
  // Each limiter needs an independent store. Sharing entries between limiters
  // with different windows/limits can accidentally weaken the stricter one.
  const store = new Map<string, { count: number; resetTime: number }>();
  let requestsSinceCleanup = 0;

  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ): Promise<boolean> {
    const key = keyGenerator(req);
    const now = Date.now();
    requestsSinceCleanup += 1;
    // Bound memory and avoid walking the entire map on every request.
    if (requestsSinceCleanup >= 100 || store.size >= MAX_TRACKED_KEYS) {
      for (const [k, v] of store.entries()) {
        if (v.resetTime <= now) store.delete(k);
      }
      requestsSinceCleanup = 0;
    }
    if (store.size >= MAX_TRACKED_KEYS && !store.has(key)) {
      const oldestKey = store.keys().next().value as string | undefined;
      if (oldestKey) store.delete(oldestKey);
    }

    // Get or create rate limit entry
    let entry = store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
      return false;
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    return true;
  };
}

// Prefer the address supplied by the trusted Cloudflare edge. The app is
// bound to its private tunnel address in production, so this also prevents a
// client-controlled X-Forwarded-For value from bypassing per-IP limits.
export function getClientIP(req: NextApiRequest): string {
  const cloudflareIP = req.headers['cf-connecting-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];

  if (cloudflareIP) {
    return Array.isArray(cloudflareIP) ? cloudflareIP[0] : cloudflareIP;
  }
  
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Predefined rate limiters
export const registrationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 registration attempts per 15 minutes per IP
});

export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes per IP
});

/**
 * CredentialsProvider cannot return a custom API response, so it uses this
 * boolean limiter and returns the same generic login failure when throttled.
 */
export function consumeLoginAttempt(identifier: string): boolean {
  const key = identifier.trim().toLowerCase() || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const current = loginAttemptStore.get(key);

  if (loginAttemptStore.size >= MAX_TRACKED_KEYS && !current) {
    for (const [storedKey, entry] of loginAttemptStore.entries()) {
      if (entry.resetTime <= now) loginAttemptStore.delete(storedKey);
    }
    if (loginAttemptStore.size >= MAX_TRACKED_KEYS) {
      const oldestKey = loginAttemptStore.keys().next().value as string | undefined;
      if (oldestKey) loginAttemptStore.delete(oldestKey);
    }
  }

  if (!current || current.resetTime <= now) {
    loginAttemptStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) return false;
  current.count += 1;
  return true;
}

export function clearLoginAttempts(identifier: string): void {
  loginAttemptStore.delete(identifier.trim().toLowerCase() || 'unknown');
}

/** Limit invitation email sends/resends per authenticated owner. */
export function consumeInviteEmailAttempt(userId: string): boolean {
  const key = userId || 'unknown';
  const now = Date.now();
  const current = inviteEmailAttemptStore.get(key);

  if (inviteEmailAttemptStore.size >= MAX_TRACKED_KEYS && !current) {
    for (const [storedKey, entry] of inviteEmailAttemptStore.entries()) {
      if (entry.resetTime <= now) inviteEmailAttemptStore.delete(storedKey);
    }
    if (inviteEmailAttemptStore.size >= MAX_TRACKED_KEYS) {
      const oldestKey = inviteEmailAttemptStore.keys().next().value as string | undefined;
      if (oldestKey) inviteEmailAttemptStore.delete(oldestKey);
    }
  }

  if (!current || current.resetTime <= now) {
    inviteEmailAttemptStore.set(key, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return true;
  }
  if (current.count >= 10) return false;
  current.count += 1;
  return true;
}

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
});

// Email-based rate limiting
export function createEmailRateLimit(windowMs: number, maxRequests: number) {
  return createRateLimit({
    windowMs,
    maxRequests,
    keyGenerator: (req) => {
      const email = req.body?.email || req.query?.email;
      return email ? `email:${String(email).trim().toLowerCase()}` : getClientIP(req);
    },
  });
}

export const emailRegistrationRateLimit = createEmailRateLimit(
  60 * 60 * 1000, // 1 hour
  3 // Allow correction of a failed registration while limiting abuse
);
