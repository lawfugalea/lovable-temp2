/**
 * Cache utility functions for PWA state synchronization
 */

/**
 * Adds cache-busting parameters and headers to fetch requests
 */
export function createCacheBustedFetch(url: string, options: RequestInit = {}): { url: string; options: RequestInit } {
  const cacheBuster = Date.now()
  const separator = url.includes('?') ? '&' : '?'
  const cacheBustedUrl = `${url}${separator}_t=${cacheBuster}`
  
  return {
    url: cacheBustedUrl,
    options: {
      ...options,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers,
      },
    },
  }
}

/**
 * Clears the service worker cache to ensure fresh data
 */
export function clearServiceWorkerCache(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
  }
}

/**
 * Wrapper for fetch that automatically adds cache-busting
 */
export async function fetchWithCacheBusting(url: string, options: RequestInit = {}): Promise<Response> {
  const cacheBuster = Date.now()
  const separator = url.includes('?') ? '&' : '?'
  const cacheBustedUrl = `${url}${separator}_t=${cacheBuster}`
  
  return fetch(cacheBustedUrl, {
    ...options,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers,
    },
  })
}

/**
 * Hook for data loading with automatic cache-busting
 */
export function useCacheBustedFetch() {
  return {
    fetch: fetchWithCacheBusting,
    clearCache: clearServiceWorkerCache,
  }
}
