export interface PackageDescriptor {
  packageValue: number | null
  packageUnit: 'G' | 'ML' | 'EA' | null
  packCount: number
}

export function normalizeCatalogText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const PACKAGE_UNIT_PATTERN = 'kg|kgs|kilograms?|g|gr|grm|grms|grams?|l|lt|ltr|ltrs|litres?|cl|ml|pcs?|pieces?|tabs?|caps?'

export function normalizeProductDescription(value: string): string {
  const withoutPackage = value
    .replace(new RegExp(`\\b\\d+\\s*[x×]\\s*\\d+(?:[.,]\\d+)?\\s*(?:${PACKAGE_UNIT_PATTERN})\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*(?:${PACKAGE_UNIT_PATTERN})\\b`, 'gi'), ' ')
  return normalizeCatalogText(withoutPackage)
}

export function normalizeBarcode(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const barcode = String(value).replace(/\D/g, '')
  if (![8, 12, 13, 14].includes(barcode.length)) return null

  const body = barcode.slice(0, -1)
  const expectedCheckDigit = Number(barcode.at(-1))
  const sum = Array.from(body).reverse().reduce((total, digit, index) => (
    total + Number(digit) * (index % 2 === 0 ? 3 : 1)
  ), 0)
  const calculatedCheckDigit = (10 - (sum % 10)) % 10
  return calculatedCheckDigit === expectedCheckDigit ? barcode : null
}

export function parsePackageDescriptor(value: string): PackageDescriptor {
  const normalized = value.toLowerCase().replace(/,/g, '.')
  const multi = normalized.match(new RegExp(`(\\d+)\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*(${PACKAGE_UNIT_PATTERN})`, 'i'))
  const single = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${PACKAGE_UNIT_PATTERN})\\b`, 'i'))
  const match = multi || single
  if (!match) return { packageValue: null, packageUnit: null, packCount: 1 }

  const packCount = multi ? Number(multi[1]) : 1
  const rawValue = Number(multi ? multi[2] : single![1])
  const rawUnit = (multi ? multi[3] : single![2]).toLowerCase()

  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(rawUnit)) return { packageValue: rawValue * 1000, packageUnit: 'G', packCount }
  if (['g', 'gr', 'grm', 'grms', 'gram', 'grams'].includes(rawUnit)) return { packageValue: rawValue, packageUnit: 'G', packCount }
  if (['l', 'lt', 'ltr', 'ltrs', 'litre', 'litres'].includes(rawUnit)) return { packageValue: rawValue * 1000, packageUnit: 'ML', packCount }
  if (rawUnit === 'cl') return { packageValue: rawValue * 10, packageUnit: 'ML', packCount }
  if (rawUnit === 'ml') return { packageValue: rawValue, packageUnit: 'ML', packCount }
  return { packageValue: rawValue, packageUnit: 'EA', packCount }
}

export function buildCanonicalExactKey(input: {
  barcode?: string | null
  name: string
  brand?: string | null
  packageValue?: number | null
  packageUnit?: string | null
  packCount?: number | null
  sourceKey?: string | null
}): { exactKey: string; source: 'BARCODE' | 'EXACT_TEXT' | 'STORE_ONLY'; confidence: number } {
  const barcode = normalizeBarcode(input.barcode)
  if (barcode) return { exactKey: `gtin:${barcode}`, source: 'BARCODE', confidence: 100 }

  const descriptor = input.packageValue == null
    ? parsePackageDescriptor(input.name)
    : {
        packageValue: input.packageValue,
        packageUnit: (input.packageUnit || '').toUpperCase() as PackageDescriptor['packageUnit'],
        packCount: input.packCount || 1,
      }
  const normalizedBrand = normalizeCatalogText(input.brand || '')
  const normalizedName = normalizeProductDescription(input.name)
  const packageKey = descriptor.packageValue == null
    ? 'unknown'
    : `${descriptor.packCount}x${descriptor.packageValue}${descriptor.packageUnit}`

  if (!normalizedBrand || descriptor.packageValue == null || !descriptor.packageUnit) {
    const sourceKey = normalizeCatalogText(input.sourceKey || '')
    return {
      exactKey: `store:${sourceKey || normalizedName}:${packageKey}`,
      source: 'STORE_ONLY',
      confidence: 0,
    }
  }

  return {
    exactKey: `text:${normalizedBrand}:${normalizedName}:${packageKey}`,
    source: 'EXACT_TEXT',
    confidence: 95,
  }
}
