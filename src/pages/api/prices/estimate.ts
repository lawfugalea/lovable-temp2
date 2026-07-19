import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiRateLimit } from '@/lib/rate-limiter';
import { getUserIdOr401 } from '@/lib/api-guards';
import { requireActiveHousehold } from '@/lib/chores';
import { getHouseholdEntitlements } from '@/lib/entitlements';
import { requirePriceComparison } from '@/lib/entitlements-core';

const MAX_TITLES = 25;
const MAX_TITLE_LENGTH = 200;

/**
 * Aggressive normalization and fuzzy ranking to estimate a price for a free-typed title.
 *
 * Response:
 * {
 *   results: Record<string, { priceCents: number; name: string; url: string }>
 * }
 */

// --- Normalization utilities ---

// Split digit<->letter boundaries and letter<->digit boundaries, split "6x1.5lt" → "6 x 1 5 l t"
// Fix glued words like "regularsoft" → "regular soft", "softdrink" → "soft drink"
function aggressiveNormalize(input: string): string {
  let s = input.toLowerCase();

  // Replace separators with space
  s = s.replace(/[_\-\/,;:+]+/g, ' ');

  // Break letter<->digit and digit<->letter boundaries
  s = s.replace(/([a-z])(\d)/g, '$1 $2');
  s = s.replace(/(\d)([a-z])/g, '$1 $2');

  // Break "x" multiplier variants (e.g., 6x1.5l, 2X500ml)
  s = s.replace(/(\d)\s*[x×]\s*(\d)/gi, '$1 x $2');

  // Split decimal points into separate tokens ("1.5" -> "1 5")
  s = s.replace(/(\d)\.(\d)/g, '$1 $2');

  // Common glued terms to split
  const gluedFixes: Array<[RegExp, string]> = [
    [/softdrink/g, 'soft drink'],
    [/softdrinks/g, 'soft drinks'],
    [/regularsoft/g, 'regular soft'],
    [/tomatosauce/g, 'tomato sauce'],
    [/passatasauce/g, 'passata sauce'],
    [/cocacola/g, 'coca cola'],
    [/dietcoke/g, 'diet coke'],
    [/pepsimax/g, 'pepsi max'],
    [/lt\b/g, 'l'], // lt → l
    [/lts\b/g, 'l'],
    [/gr\b/g, 'g'],
  ];
  for (const [re, rep] of gluedFixes) s = s.replace(re, rep);

  // Strip punctuation except spaces
  s = s.replace(/[()"'`.!?]|&/g, ' ');

  // Collapse extra whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

function tokensOf(s: string): string[] {
  return aggressiveNormalize(s).split(/\s+/).filter(Boolean);
}

function tokenOverlapScore(aTokens: string[], bTokens: string[]): number {
  const aSet = new Set(aTokens);
  let overlap = 0;
  for (const t of bTokens) if (aSet.has(t)) overlap += 1;
  // Normalize by smaller length to avoid bias
  const denom = Math.max(1, Math.min(aTokens.length, bTokens.length));
  return overlap / denom;
}

// Longest Common Substring length (not subsequence)
function lcsLength(a: string, b: string): number {
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best) best = dp[i][j];
      }
    }
  }
  return best;
}

function similarityScore(a: string, b: string): number {
  const lcs = lcsLength(a, b);
  const denom = Math.max(a.length, b.length) || 1;
  return lcs / denom; // 0..1
}

function buildOrWhere(tokens: string[]) {
  return tokens.map((t) => ({ nameNormalized: { contains: t } }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const userId = await getUserIdOr401(req, res);
  if (!userId) return;
  if (!(await apiRateLimit(req, res))) return;
  const householdId = await requireActiveHousehold(req, res, userId);
  if (!householdId) return;
  const entitlements = await getHouseholdEntitlements(householdId);
  if (!requirePriceComparison(res, entitlements)) return;

  const qInput =
    req.method === 'GET'
      ? (req.query.q ?? '').toString()
      : typeof req.body?.q === 'string'
      ? req.body.q
      : '';

  if (req.method === 'POST' && req.body?.titles !== undefined && !Array.isArray(req.body.titles)) {
    return res.status(400).json({ error: 'titles must be an array' });
  }
  if (Array.isArray(req.body?.titles) && req.body.titles.length > MAX_TITLES) {
    return res.status(400).json({ error: `A maximum of ${MAX_TITLES} titles is allowed` });
  }

  const rawTitles: unknown[] = req.method === 'GET'
    ? [qInput]
    : Array.isArray(req.body?.titles)
      ? req.body.titles
      : qInput
        ? [qInput]
        : [];
  const titles: string[] = rawTitles
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map(value => value.trim());

  if (titles.some(title => title.length > MAX_TITLE_LENGTH)) {
    return res.status(400).json({ error: `Titles must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }

  if (!titles.length) {
    return res.status(200).json({ results: {} });
  }

  const results: Record<string, { priceCents: number; name: string; url: string }> = {};

  try {
    for (const title of titles) {
      const norm = aggressiveNormalize(title);
      const tokens = tokensOf(title).slice(0, 8);

      // Fallback token set: first two tokens and any numeric tokens to capture sizes like "1 5 l"
      const numericTokens = tokens.filter((t) => /^\d+(\.\d+)?$/.test(t));
      const firstTwo = tokens.slice(0, 2);
      const orTokens = Array.from(new Set([...tokens, ...firstTwo, ...numericTokens])).slice(
        0,
        10
      );

      // Pull up to 80 candidates with token-OR, Smart domain preferred
      const candidates = await prisma.priceProduct.findMany({
        where: {
          sourceUrl: { contains: 'smart.com.mt' },
          OR: orTokens.length ? buildOrWhere(orTokens) : undefined,
        },
        select: {
          id: true,
          name: true,
          nameNormalized: true,
          sourceUrl: true,
          offers: {
            orderBy: { scrapedAt: 'desc' },
            take: 1,
            select: { priceCents: true, scrapedAt: true },
          },
        },
        take: 80,
      });

      // Ranking
      const aTokens = tokensOf(norm);
      const aStr = aggressiveNormalize(norm);

      const ranked = candidates
        .map((p) => {
          const bStr = aggressiveNormalize(p.nameNormalized || p.name);
          const bTokens = tokensOf(bStr);
          const overlap = tokenOverlapScore(aTokens, bTokens);
          const sim = similarityScore(aStr, bStr);
          // Weight overlap a bit more; add tiny recency preference (no timestamp if no offers)
          const latest = p.offers[0];
          const recencyBoost = latest ? Math.min(0.1, 1 / (1 + (Date.now() - new Date(latest.scrapedAt).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;
          const score = overlap * 0.7 + sim * 0.3 + recencyBoost;

          return {
            product: p,
            latest,
            score,
            overlap,
            sim,
          };
        })
        .filter((r) => r.latest) // require a known price
        .sort((a, b) => b.score - a.score);

      // Acceptance: any overlap or decent similarity; otherwise fallback strategies
      let winner = ranked.find((r) => r.overlap > 0 || r.sim >= 0.25);

      if (!winner) {
        // Fallback 1: nameNormalized contains normalized query
        const contains = candidates
          .filter((p) => p.offers[0])
          .filter((p) => {
            const n = (p.nameNormalized || p.name).toLowerCase();
            return n.includes(aStr);
          })
          .sort((a, b) => (a.offers[0] && b.offers[0]
            ? new Date(b.offers[0]!.scrapedAt).getTime() - new Date(a.offers[0]!.scrapedAt).getTime()
            : 0));
        if (contains[0]) {
          winner = {
            product: contains[0],
            latest: contains[0].offers[0],
            score: 0.01,
            overlap: 0,
            sim: 0,
          };
        }
      }

      if (!winner && firstTwo.length) {
        // Fallback 2: first two tokens AND together
        const firstTwoStr = firstTwo.join(' ');
        const containsTwo = candidates
          .filter((p) => p.offers[0])
          .filter((p) => (p.nameNormalized || p.name).toLowerCase().includes(firstTwoStr));
        if (containsTwo[0]) {
          winner = {
            product: containsTwo[0],
            latest: containsTwo[0].offers[0],
            score: 0.005,
            overlap: 0,
            sim: 0,
          };
        }
      }

      if (winner && winner.latest) {
        results[title] = {
          priceCents: winner.latest.priceCents,
          name: winner.product.name,
          url: winner.product.sourceUrl,
        };
      }
    }

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error('estimate error', err);
    return res.status(200).json({ results: {} });
  }
}
