/**
 * Display names for banks as shown in the UI.
 *
 * Connections store the ASPSP name exactly as Enable Banking's directory
 * spells it, because authorization calls are name- and spelling-sensitive —
 * but some directory spellings are not fit for display ("Bank Of Valetta").
 * Keep protocol names in the data and fix them up here, once, for copy.
 */
const DISPLAY_NAMES: Record<string, string> = {
  'bank of valetta': 'Bank of Valletta',
  'bank of valletta': 'Bank of Valletta',
}

export function bankDisplayName(aspspName: string | null | undefined): string {
  const name = aspspName?.trim()
  if (!name) return 'your bank'
  return DISPLAY_NAMES[name.toLowerCase()] ?? name
}
