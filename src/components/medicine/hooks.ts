import { useCallback, useEffect, useState } from 'react'
import type { Child, Medicine, MedicineDose } from './types'

/** Re-render on a fixed tick so countdowns and due badges stay current. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])
  return now
}

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** fetch wrapper that throws an ApiError with the API's message, status, and body. */
export async function apiRequest(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let data: unknown = null
    try {
      data = await response.json()
      const err = (data as { error?: string } | null)?.error
      if (err) message = err
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new ApiError(message, response.status, data)
  }
  return response
}

export function useMedicineData(householdId: string | null | undefined) {
  const [children, setChildren] = useState<Child[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [doses, setDoses] = useState<MedicineDose[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!householdId) return
    try {
      const [childrenRes, medicinesRes, dosesRes] = await Promise.all([
        apiRequest(`/api/medicine/children?householdId=${householdId}`),
        apiRequest(`/api/medicine/medicines?householdId=${householdId}`),
        apiRequest(`/api/medicine/doses?householdId=${householdId}`),
      ])
      setChildren(await childrenRes.json())
      setMedicines(await medicinesRes.json())
      setDoses(await dosesRes.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicine data')
    }
  }, [householdId])

  useEffect(() => {
    if (!householdId) return
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [householdId, reload])

  return { children, medicines, doses, loading, error, reload }
}
