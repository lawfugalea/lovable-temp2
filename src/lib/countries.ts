/** Curated household-country choices. Only MT changes behaviour today. */
export const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'MT', label: 'Malta' },
  { code: 'IT', label: 'Italy' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'IE', label: 'Ireland' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'ES', label: 'Spain' },
  { code: 'PT', label: 'Portugal' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'ZZ', label: 'Somewhere else' },
]

/** ISO user-assigned code for "not in the list". */
export const FALLBACK_COUNTRY = 'ZZ'

export function countryLabel(code: string): string {
  return COUNTRY_OPTIONS.find(option => option.code === code)?.label ?? code
}
