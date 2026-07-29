import { appUrl } from '../links'

export function isFinanceProviderConfigured(): boolean {
  return Boolean(
    process.env.ENABLE_BANKING_APPLICATION_ID?.trim()
    && (process.env.ENABLE_BANKING_PRIVATE_KEY?.trim() || process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64?.trim()),
  )
}

/**
 * Enable Banking only accepts redirect URIs registered against the application,
 * so this has to match the control panel exactly. It defaults to the callback on
 * APP_URL, and the override exists for when the app is reached on a different
 * host or base path than the one registered with the provider.
 */
export function getFinanceRedirectUrl(): string {
  return process.env.ENABLE_BANKING_REDIRECT_URL?.trim() || appUrl('/api/finance/callback')
}

export function getFinanceAspsp(): { name: string; country: string } {
  return {
    // Enable Banking's production directory currently exposes BOV with this
    // exact name and spelling. ASPSP names are case- and spelling-sensitive.
    name: process.env.ENABLE_BANKING_ASPSP_NAME?.trim() || 'Bank Of Valetta',
    country: (process.env.ENABLE_BANKING_ASPSP_COUNTRY?.trim() || 'MT').toUpperCase(),
  }
}
