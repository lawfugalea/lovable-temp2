const SUPPORTED_SUPERMARKET_SLUGS = new Set([
  'smart',
  'greens',
  'welbees',
  'pavipama',
  'happyshopper',
])

type SupermarketConsentEnv = Record<string, string | undefined>

/**
 * Retailer catalogues are deny-by-default. Add a slug only after the operator
 * has documented permission to collect and present that retailer's data.
 */
export function getConsentedSupermarketSlugs(
  env: SupermarketConsentEnv = process.env,
): string[] {
  return Array.from(new Set(
    String(env.SUPERMARKET_CONSENTED_STORES || env.HOUSEFLOW_CONSENTED_SUPERMARKET_STORES || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(slug => SUPPORTED_SUPERMARKET_SLUGS.has(slug)),
  ))
}

export function isSupermarketComparisonAvailable(
  env: SupermarketConsentEnv = process.env,
): boolean {
  return getConsentedSupermarketSlugs(env).length > 0
}

export function isSupermarketConsented(
  slug: string,
  env: SupermarketConsentEnv = process.env,
): boolean {
  return getConsentedSupermarketSlugs(env).includes(slug.trim().toLowerCase())
}
