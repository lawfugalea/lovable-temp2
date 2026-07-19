import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { withBasePath } from '@/lib/base-path'
import { safeRetailerSourceUrl } from '@/lib/catalog-source-url'
import { requireActiveHousehold } from '@/lib/chores'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { requirePriceComparison } from '@/lib/entitlements-core'

const FRESH_HOURS = 48
// Retailers anchor half the catalogue with strike-through prices; only a
// meaningful cut counts as an offer worth highlighting.
const MIN_DISCOUNT_RATIO = 0.15
const MAX_DISCOUNT_RATIO = 0.9
const MIN_SAVING_CENTS = 30
const MAX_RESULTS = 200

interface OfferRow {
  productId: string
  priceCents: number
  regularPriceCents: number
  loyaltyPriceCents: number | null
  unit: string | null
  scrapedAt: Date
  name: string
  brand: string | null
  imageUrl: string | null
  sourceUrl: string
  canonicalProductId: string | null
  lastSeenAt: Date | null
  packageValue: Prisma.Decimal | null
  packageUnit: string | null
  packCount: number
  storeName: string
  storeSlug: string
}

function browserImageUrl(value: string | null, storeSlug: string): string | null {
  if (!value) return null
  if (storeSlug === 'smart' && /^http:\/\/www\.smart\.com\.mt\//i.test(value)) {
    return withBasePath(`/api/image-proxy?url=${encodeURIComponent(value)}`)
  }
  return value
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (!(await apiRateLimit(req, res))) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  const entitlements = await getHouseholdEntitlements(householdId)
  if (!requirePriceComparison(res, entitlements)) return

  const since = new Date(Date.now() - FRESH_HOURS * 3600 * 1000)

  // Latest offer per store product; a product is on offer only if its most
  // recent observation is discounted, so superseded promotions never linger.
  // Fetched twice — best by percentage and best by absolute saving — so the
  // client can offer both sort orders without missing big-ticket discounts.
  const fetchTop = (orderBy: Prisma.Sql) => prisma.$queryRaw<OfferRow[]>`
    SELECT
      latest."productId",
      latest."priceCents",
      latest."regularPriceCents",
      latest."loyaltyPriceCents",
      latest.unit,
      latest."scrapedAt",
      p.name,
      p.brand,
      p."imageUrl",
      p."sourceUrl",
      p."canonicalProductId",
      p."lastSeenAt",
      p."packageValue",
      p."packageUnit",
      p."packCount",
      s.name AS "storeName",
      s.slug AS "storeSlug"
    FROM (
      SELECT DISTINCT ON (o."productId")
        o."productId", o."priceCents", o."regularPriceCents", o."loyaltyPriceCents",
        o.unit, o."scrapedAt", o.available
      FROM "PriceOffer" o
      WHERE o."scrapedAt" >= ${since}
      ORDER BY o."productId", o."scrapedAt" DESC
    ) latest
    JOIN "PriceProduct" p ON p.id = latest."productId" AND p.active
    JOIN "Store" s ON s.id = p."storeId" AND s.enabled
    WHERE latest.available
      AND latest."regularPriceCents" IS NOT NULL
      AND latest."regularPriceCents" - latest."priceCents" >= ${MIN_SAVING_CENTS}
      AND latest."priceCents" > 0
      AND (latest."regularPriceCents" - latest."priceCents")::float / latest."regularPriceCents" >= ${MIN_DISCOUNT_RATIO}
      AND (latest."regularPriceCents" - latest."priceCents")::float / latest."regularPriceCents" <= ${MAX_DISCOUNT_RATIO}
    ORDER BY ${orderBy} DESC
    LIMIT ${MAX_RESULTS}
  `

  const [byPercent, bySaving] = await Promise.all([
    fetchTop(Prisma.sql`(latest."regularPriceCents" - latest."priceCents")::float / latest."regularPriceCents"`),
    fetchTop(Prisma.sql`latest."regularPriceCents" - latest."priceCents"`),
  ])
  const rows = [...byPercent]
  const seen = new Set(byPercent.map(row => row.productId))
  for (const row of bySaving) {
    if (!seen.has(row.productId)) {
      seen.add(row.productId)
      rows.push(row)
    }
  }

  const offers = rows.map(row => {
    const savingCents = row.regularPriceCents - row.priceCents
    return {
      productId: row.productId,
      canonicalProductId: row.canonicalProductId,
      title: row.name,
      brand: row.brand,
      packageValue: row.packageValue?.toString() || null,
      packageUnit: row.packageUnit,
      packCount: row.packCount,
      imageUrl: browserImageUrl(row.imageUrl, row.storeSlug),
      sourceUrl: safeRetailerSourceUrl(row.sourceUrl, row.storeSlug),
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      priceCents: row.priceCents,
      regularPriceCents: row.regularPriceCents,
      loyaltyPriceCents: row.loyaltyPriceCents,
      savingCents,
      discountPercent: Math.round((savingCents / row.regularPriceCents) * 100),
      unit: row.unit,
      observedAt: (row.lastSeenAt || row.scrapedAt).toISOString(),
    }
  })

  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).json({ offers })
}

export default withApiHandler(handler)
