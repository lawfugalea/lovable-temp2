import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { apiRateLimit } from '@/lib/rate-limiter';
import { getUserIdOr401 } from '@/lib/api-guards';
import { requireActiveHousehold } from '@/lib/chores';
import { getHouseholdEntitlements } from '@/lib/entitlements';
import { requirePriceComparison } from '@/lib/entitlements-core';

const MAX_QUERY_LENGTH = 200;

/**
 * Response shape:
 * {
 *   items: Array<{
 *     id: string;
 *     title: string;
 *     store: 'Smart Supermarket';
 *     price: string; // e.g., "0.89 EUR" or "0.79 EUR (was 1.09 EUR)"
 *     nowCents: number;
 *     wasCents?: number;
 *     imageUrl: string;
 *     url: string;
 *   }>
 * }
 */

function centsToEUR(cents: number) {
  return (cents / 100).toFixed(2) + ' EUR';
}

// Helper function to format image URLs through our proxy
function formatImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  
  // If it's an HTTP URL from smart.com.mt, proxy it through our API
  if (imageUrl.startsWith('http://www.smart.com.mt/')) {
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // If it's already HTTPS or a relative path, return as is
  return imageUrl;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  if (!(await apiRateLimit(req, res))) return;
  const householdId = await requireActiveHousehold(req, res, userId);
  if (!householdId) return;
  const entitlements = await getHouseholdEntitlements(householdId);
  if (!requirePriceComparison(res, entitlements)) return;

  const qRaw = (req.query.q ?? '').toString().trim();
  if (qRaw.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` });
  }
  if (!qRaw) {
    return res.status(200).json({ items: [] });
  }

  // Lightweight normalization for search (not as aggressive as estimator).
  const q = qRaw.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  const tokens = Array.from(new Set(q.split(/\s+/).filter(Boolean))).slice(0, 6);

  // Prefer Smart Supermarket by detecting its domain in product sourceUrl.
  // Also only consider products that have an image.
  // Limit candidates for performance; sort by rough textual proximity.
  const whereOr = tokens.map((t) => ({
    nameNormalized: { contains: t },
  }));

  try {
    const candidates = await prisma.priceProduct.findMany({
      where: {
        imageUrl: { not: null },
        sourceUrl: { contains: 'smart.com.mt' },
        OR: whereOr.length ? whereOr : undefined,
      },
      select: {
        id: true,
        name: true,
        sourceUrl: true,
        imageUrl: true,
        offers: {
          orderBy: { scrapedAt: 'desc' },
          take: 20, // grab a window to compute latest + was within 30d
          select: {
            id: true,
            priceCents: true,
            scrapedAt: true,
            currency: true,
          },
        },
      },
      take: 200, // raw candidate cap - increased to find more products
    });

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // Rank: simple token overlap + startsWith bonus
    const score = (name: string) => {
      const n = name.toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (n.includes(t)) s += 1;
        if (n.startsWith(t)) s += 0.5;
      }
      return s;
    };

    const withOffers = candidates
      .map((p) => {
        const latest = p.offers[0];
        if (!latest) return null;

        // Look back 30d for any higher price (was)
        const recent = p.offers.filter(
          (o) => now - new Date(o.scrapedAt).getTime() <= THIRTY_DAYS
        );
        const maxRecent = recent.reduce<number | null>(
          (acc, o) => (acc === null ? o.priceCents : Math.max(acc, o.priceCents)),
          null
        );

        const wasCents =
          maxRecent !== null && maxRecent > latest.priceCents ? maxRecent : undefined;

        const price =
          wasCents !== undefined
            ? `${centsToEUR(latest.priceCents)} (was ${centsToEUR(wasCents)})`
            : centsToEUR(latest.priceCents);

        return {
          id: p.id,
          title: p.name,
          store: 'Smart Supermarket' as const,
          price,
          nowCents: latest.priceCents,
          wasCents,
          imageUrl: formatImageUrl(p.imageUrl),
          url: p.sourceUrl,
          _score: score(p.name),
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        title: string;
        store: 'Smart Supermarket';
        price: string;
        nowCents: number;
        wasCents?: number;
        imageUrl: string | null;
        url: string;
        _score: number;
      }>;

    // Prefer higher score and products with very recent offer first (small tie-breaker)
    withOffers.sort((a, b) => b._score - a._score);

    const items = withOffers.slice(0, 50).map(({ _score, ...rest }) => rest);

    return res.status(200).json({ items });
  } catch (err: any) {
    console.error('suggest error', err);
    return res.status(200).json({ items: [] });
  }
}

export default withApiHandler(handler)
