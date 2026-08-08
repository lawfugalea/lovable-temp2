/**
 * Per-user allowlist for the open-banking surface.
 *
 * Bank connections run against a restricted Enable Banking production
 * application, so the whole banking module is limited to the named account
 * holders rather than to a household: other members of the same household
 * (children, guests) must neither see nor reach it.
 *
 * `BANKING_ALLOWED_EMAILS` is a comma-separated list. When it is unset, the
 * older single-owner variable `FINANCE_OWNER_EMAIL` acts as a one-entry
 * allowlist so existing deployments keep their behaviour. When neither is set,
 * banking is off for everyone.
 */
export function getBankingAllowedEmails(): string[] {
  const raw = process.env.BANKING_ALLOWED_EMAILS || process.env.FINANCE_OWNER_EMAIL || ''
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isBankingAllowedEmail(email?: string | null): boolean {
  if (!email) return false
  return getBankingAllowedEmails().includes(email.trim().toLowerCase())
}
