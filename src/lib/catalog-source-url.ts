const RETAILER_SOURCES: Record<string, { fallback: string; hosts: Set<string> }> = {
  smart: {
    fallback: 'http://www.smart.com.mt/forms/Products.aspx',
    hosts: new Set(['smart.com.mt', 'www.smart.com.mt']),
  },
  greens: {
    fallback: 'https://www.greens.com.mt/products',
    hosts: new Set(['greens.com.mt', 'www.greens.com.mt']),
  },
  welbees: {
    fallback: 'https://welbees.mt/shop',
    hosts: new Set(['welbees.mt', 'www.welbees.mt']),
  },
  pavipama: {
    fallback: 'https://pavipama.com.mt/',
    hosts: new Set(['pavipama.com.mt', 'www.pavipama.com.mt']),
  },
}

export function safeRetailerSourceUrl(value: string | null, storeSlug: string): string | null {
  const retailer = RETAILER_SOURCES[storeSlug]
  if (!retailer) return null
  try {
    const url = new URL(value || retailer.fallback)
    if (!['http:', 'https:'].includes(url.protocol)) return retailer.fallback
    if (!retailer.hosts.has(url.hostname.toLowerCase())) return retailer.fallback
    return url.toString()
  } catch {
    return retailer.fallback
  }
}
