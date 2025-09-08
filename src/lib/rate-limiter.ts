import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ): Promise<boolean> {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
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

// Get client IP address
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
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
      return email ? `email:${email}` : getClientIP(req);
    },
  });
}

export const emailRegistrationRateLimit = createEmailRateLimit(
  60 * 60 * 1000, // 1 hour
  1 // 1 registration per email per hour
);
