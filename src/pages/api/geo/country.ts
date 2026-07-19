import type { NextApiRequest, NextApiResponse } from 'next';
import { apiRateLimit } from '@/lib/rate-limiter';

const COUNTRY_RE = /^[A-Z]{2}$/;

/** Country headers set by common CDNs / reverse proxies, in order of trust. */
const GEO_HEADERS = ['cf-ipcountry', 'x-vercel-ip-country', 'x-geo-country', 'x-country-code'] as const;

/**
 * Best-effort country guess from infrastructure geo headers. Used only to
 * prefill the household-creation wizard; the stored household country is
 * always the user's explicit choice. Returns { country: null } when the
 * proxy provides no signal — the client falls back to the browser timezone.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await apiRateLimit(req, res))) return;
  res.setHeader('Cache-Control', 'no-store');

  for (const header of GEO_HEADERS) {
    const raw = req.headers[header];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase();
    if (value && COUNTRY_RE.test(value)) {
      return res.status(200).json({ country: value });
    }
  }
  return res.status(200).json({ country: null });
}
