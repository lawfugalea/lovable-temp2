import { createSign } from 'node:crypto'

const API_BASE_URL = 'https://api.enablebanking.com'
const JWT_ISSUER = 'enablebanking.com'
const JWT_AUDIENCE = 'api.enablebanking.com'

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function privateKey(): string {
  const configured = process.env.ENABLE_BANKING_PRIVATE_KEY?.trim()
  if (configured) return configured.includes('\\n') ? configured.replace(/\\n/g, '\n') : configured
  const encoded = process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64?.trim()
  if (encoded) return Buffer.from(encoded, 'base64').toString('utf8')
  throw new EnableBankingError('Enable Banking private key is not configured', 503, 'CONFIGURATION_ERROR')
}

export function createEnableBankingJwt(now = new Date()): string {
  const applicationId = process.env.ENABLE_BANKING_APPLICATION_ID?.trim()
  if (!applicationId) throw new EnableBankingError('Enable Banking application ID is not configured', 503, 'CONFIGURATION_ERROR')

  const iat = Math.floor(now.getTime() / 1000)
  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: applicationId }))
  const payload = base64url(JSON.stringify({
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat,
    exp: iat + 300,
  }))
  const unsigned = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return `${unsigned}.${signer.sign(privateKey()).toString('base64url')}`
}

export class EnableBankingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'EnableBankingError'
  }
}

export function isReauthorizationError(error: unknown): boolean {
  if (!(error instanceof EnableBankingError)) return false
  const code = error.code?.toUpperCase() || ''
  return error.status === 401 || code.includes('SESSION') || code.includes('CONSENT') || code.includes('REVOK')
}

// PSD2 lets a bank cap unattended access to a handful of calls per account per
// day. Hitting that cap is not a broken connection, so it must not flip the
// connection into ERROR or prompt the household to reauthorize.
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof EnableBankingError)) return false
  if (error.status === 429) return true
  const text = `${error.code || ''} ${error.message}`.toUpperCase()
  return text.includes('MAXIMUM DAILY ACCESS')
    || text.includes('ACCESS_EXCEEDED')
    || text.includes('ACCESS_LIMIT')
    || text.includes('TOO MANY REQUESTS')
}

export function publicSyncError(error: unknown): string {
  if (isRateLimitError(error)) {
    return 'Your bank only allows a few refreshes per day and today’s are used up. Your data is still connected — the next refresh will work tomorrow.'
  }
  if (error instanceof EnableBankingError) return error.message.slice(0, 500)
  return 'Bank sync failed unexpectedly'
}

function providerMessage(payload: unknown, fallback: string): { message: string; code?: string } {
  if (!payload || typeof payload !== 'object') return { message: fallback }
  const body = payload as Record<string, unknown>
  const message = [body.message, body.error_description, body.detail, body.error]
    .find(value => typeof value === 'string' && value.trim())
  const code = [body.code, body.error_code, body.error]
    .find(value => typeof value === 'string' && value.trim())
  return {
    message: String(message || fallback).slice(0, 500),
    code: typeof code === 'string' ? code.slice(0, 100) : undefined,
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${createEnableBankingJwt()}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const details = providerMessage(payload, `Enable Banking request failed (${response.status})`)
      throw new EnableBankingError(details.message, response.status, details.code)
    }
    return payload as T
  } catch (error) {
    if (error instanceof EnableBankingError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EnableBankingError('Enable Banking did not respond in time', 504, 'TIMEOUT')
    }
    throw new EnableBankingError('Unable to reach Enable Banking', 502, 'CONNECTION_ERROR')
  } finally {
    clearTimeout(timeout)
  }
}

export type EnableBankingSessionAccount = Record<string, unknown> & {
  uid?: string
  identification_hash?: string
}

export type EnableBankingSession = Record<string, unknown> & {
  session_id?: string
  status?: string
  access?: { valid_until?: string }
  accounts?: EnableBankingSessionAccount[] | string[]
  accounts_data?: EnableBankingSessionAccount[]
}

export async function startBovAuthorization(input: {
  state: string
  redirectUrl: string
  aspsp?: { name: string; country: string }
}): Promise<{ url: string }> {
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const aspsp = input.aspsp || { name: 'Bank of Valletta', country: 'MT' }
  return request<{ url: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: validUntil.toISOString() },
      aspsp,
      state: input.state,
      redirect_url: input.redirectUrl,
      psu_type: 'personal',
    }),
  })
}

export function completeAuthorization(code: string): Promise<EnableBankingSession> {
  return request<EnableBankingSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function getProviderSession(sessionId: string): Promise<EnableBankingSession> {
  return request<EnableBankingSession>(`/sessions/${encodeURIComponent(sessionId)}`)
}

export function deleteProviderSession(sessionId: string): Promise<{ message?: string }> {
  return request<{ message?: string }>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
}

export function getProviderAccountDetails(accountId: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/accounts/${encodeURIComponent(accountId)}/details`)
}

export function getProviderBalances(accountId: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/accounts/${encodeURIComponent(accountId)}/balances`)
}

export async function getProviderTransactions(input: {
  accountId: string
  dateFrom: string
  transactionStatus: 'BOOK' | 'PDNG'
}): Promise<Record<string, unknown>[]> {
  const transactions: Record<string, unknown>[] = []
  let continuationKey: string | null = null
  let pages = 0

  do {
    const query = new URLSearchParams({
      date_from: input.dateFrom,
      transaction_status: input.transactionStatus,
    })
    if (continuationKey) query.set('continuation_key', continuationKey)
    const payload = await request<Record<string, unknown>>(
      `/accounts/${encodeURIComponent(input.accountId)}/transactions?${query.toString()}`,
    )
    const page = Array.isArray(payload.transactions) ? payload.transactions : []
    for (const item of page) {
      if (item && typeof item === 'object') transactions.push(item as Record<string, unknown>)
    }
    continuationKey = typeof payload.continuation_key === 'string' && payload.continuation_key
      ? payload.continuation_key
      : null
    pages += 1
    if (pages >= 100 && continuationKey) {
      throw new EnableBankingError('Transaction pagination exceeded the safety limit', 502, 'PAGINATION_LIMIT')
    }
  } while (continuationKey)

  return transactions
}
