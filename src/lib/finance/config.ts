export function getFinanceOwnerEmail(): string | null {
  const configured = process.env.FINANCE_OWNER_EMAIL?.trim().toLowerCase()
  return configured || null
}

export function isFinanceOwner(email: string | null | undefined): boolean {
  const ownerEmail = getFinanceOwnerEmail()
  return Boolean(ownerEmail && email && email.trim().toLowerCase() === ownerEmail)
}

export function isFinanceProviderConfigured(): boolean {
  return Boolean(
    process.env.ENABLE_BANKING_APPLICATION_ID?.trim()
    && (process.env.ENABLE_BANKING_PRIVATE_KEY?.trim() || process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64?.trim()),
  )
}

export function getFinanceAspsp(): { name: string; country: string } {
  return {
    // Enable Banking's production directory currently exposes BOV with this
    // exact name and spelling. ASPSP names are case- and spelling-sensitive.
    name: process.env.ENABLE_BANKING_ASPSP_NAME?.trim() || 'Bank Of Valetta',
    country: (process.env.ENABLE_BANKING_ASPSP_COUNTRY?.trim() || 'MT').toUpperCase(),
  }
}
