import type {
  MobileBootstrapResponse,
  MobileLoginRequest,
  MobileLoginResponse,
  MobileRefreshResponse,
  MobileTokens,
} from '@clankeep/contracts'
import * as SecureStore from 'expo-secure-store'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, authenticatedRequest, publicRequest } from '@/api'

const ACCESS_KEY = 'clankeep.mobile.access-token'
const REFRESH_KEY = 'clankeep.mobile.refresh-token'

type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

type AuthContextValue = {
  status: AuthStatus
  bootstrap: MobileBootstrapResponse | null
  login: (input: MobileLoginRequest) => Promise<void>
  logout: () => Promise<void>
  request: <T>(path: string, init?: RequestInit) => Promise<T>
  selectHousehold: (householdId: string) => Promise<void>
  reloadBootstrap: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function persistTokens(tokens: MobileTokens | null) {
  if (!tokens) {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)])
    return
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [bootstrap, setBootstrap] = useState<MobileBootstrapResponse | null>(null)
  const [tokens, setTokens] = useState<MobileTokens | null>(null)
  const tokensRef = useRef<MobileTokens | null>(null)
  const refreshPromiseRef = useRef<Promise<MobileRefreshResponse> | null>(null)

  const clearSession = useCallback(async () => {
    tokensRef.current = null
    setTokens(null)
    setBootstrap(null)
    setStatus('signed-out')
    await persistTokens(null)
  }, [])

  const acceptTokens = useCallback(async (next: MobileTokens) => {
    tokensRef.current = next
    setTokens(next)
    await persistTokens(next)
  }, [])

  const refresh = useCallback(async (currentRefreshToken: string) => {
    const next = await publicRequest<MobileRefreshResponse>('/api/mobile/v1/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken: currentRefreshToken }),
    })
    await acceptTokens(next)
    return next
  }, [acceptTokens])

  const refreshOnce = useCallback((currentRefreshToken: string) => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current
    const pending = refresh(currentRefreshToken)
    refreshPromiseRef.current = pending
    const clear = () => { if (refreshPromiseRef.current === pending) refreshPromiseRef.current = null }
    void pending.then(clear, clear)
    return pending
  }, [refresh])

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const current = tokensRef.current
    if (!current) throw new ApiError('Sign in required', 401, 'MOBILE_AUTH_REQUIRED')
    try {
      return await authenticatedRequest<T>(path, current.accessToken, init)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      try {
        const latest = tokensRef.current
        if (latest && latest.accessToken !== current.accessToken) return await authenticatedRequest<T>(path, latest.accessToken, init)
        const next = await refreshOnce(current.refreshToken)
        return await authenticatedRequest<T>(path, next.accessToken, init)
      } catch (refreshError) {
        await clearSession()
        throw refreshError
      }
    }
  }, [clearSession, refreshOnce])

  useEffect(() => {
    let active = true
    void (async () => {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY), SecureStore.getItemAsync(REFRESH_KEY),
      ])
      if (!active) return
      if (!accessToken || !refreshToken) return setStatus('signed-out')
      const restored = { accessToken, refreshToken, accessTokenExpiresIn: 0 }
      tokensRef.current = restored
      setTokens(restored)
      try {
        const data = await authenticatedRequest<MobileBootstrapResponse>('/api/mobile/v1/bootstrap', accessToken)
        if (active) {
          setBootstrap(data)
          setStatus('signed-in')
        }
      } catch {
        try {
          const next = await refreshOnce(refreshToken)
          const data = await authenticatedRequest<MobileBootstrapResponse>('/api/mobile/v1/bootstrap', next.accessToken)
          if (active) {
            setBootstrap(data)
            setStatus('signed-in')
          }
        } catch {
          if (active) await clearSession()
        }
      }
    })()
    return () => { active = false }
  }, [clearSession, refreshOnce])

  const login = useCallback(async (input: MobileLoginRequest) => {
    const response = await publicRequest<MobileLoginResponse>('/api/mobile/v1/auth/login', {
      method: 'POST', body: JSON.stringify(input),
    })
    await acceptTokens(response)
    setBootstrap(response.bootstrap)
    setStatus('signed-in')
  }, [acceptTokens])

  const logout = useCallback(async () => {
    if (tokens?.refreshToken) {
      await publicRequest('/api/mobile/v1/auth/logout', {
        method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }).catch(() => undefined)
    }
    await clearSession()
  }, [clearSession, tokens])

  const selectHousehold = useCallback(async (householdId: string) => {
    await request('/api/mobile/v1/household/active', {
      method: 'POST', body: JSON.stringify({ householdId }),
    })
    const next = await request<MobileBootstrapResponse>('/api/mobile/v1/bootstrap')
    setBootstrap(next)
  }, [request])

  const reloadBootstrap = useCallback(async () => {
    const next = await request<MobileBootstrapResponse>('/api/mobile/v1/bootstrap')
    setBootstrap(next)
  }, [request])

  const value = useMemo<AuthContextValue>(() => ({ status, bootstrap, login, logout, request, selectHousehold, reloadBootstrap }), [
    status, bootstrap, login, logout, request, selectHousehold, reloadBootstrap,
  ])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
