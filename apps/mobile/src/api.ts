import type { MobileApiError, MobileTokens } from '@clankeep/contracts'

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '')
export const apiBaseUrl = configuredUrl || 'http://localhost:3000'

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public data?: unknown) {
    super(message)
  }
}

async function parseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({})) as Partial<MobileApiError>
  return new ApiError(body.error || `Request failed (${response.status})`, response.status, body.code, body)
}

export async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const formData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { ...(formData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers },
  })
  if (!response.ok) throw await parseError(response)
  return response.json() as Promise<T>
}

export async function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const formData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(formData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })
  if (!response.ok) throw await parseError(response)
  return response.json() as Promise<T>
}

export function isTokenResponse(value: unknown): value is MobileTokens {
  const candidate = value as Partial<MobileTokens> | null
  return Boolean(candidate?.accessToken && candidate.refreshToken && candidate.accessTokenExpiresIn)
}
