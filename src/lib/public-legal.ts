export type PublicLegalConfig = {
  controllerName: string
  contactEmail: string
  contactConfigured: boolean
  lastUpdated: string
}

/**
 * Version stamp recorded against a user's Terms/Privacy acceptance at signup.
 * Bump this (and `lastUpdated`) whenever the legal terms materially change so a
 * re-acceptance can be required.
 */
export const TERMS_VERSION = '2026-07-19'

/**
 * Values shown on the public privacy and terms pages. The finance-owner fallback
 * keeps a personal deployment usable without inventing a separate DPO mailbox.
 * Both possible email values are public when this fallback is used.
 */
export function getPublicLegalConfig(): PublicLegalConfig {
  const dedicatedEmail = process.env.DATA_PROTECTION_EMAIL?.trim()
  const financeOwnerEmail = process.env.FINANCE_OWNER_EMAIL?.trim()

  return {
    controllerName: process.env.PRIVACY_CONTROLLER_NAME?.trim() || 'Clankeep deployment operator',
    contactEmail: dedicatedEmail || financeOwnerEmail || '',
    contactConfigured: Boolean(dedicatedEmail || financeOwnerEmail),
    lastUpdated: '19 July 2026',
  }
}
