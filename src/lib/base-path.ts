const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const APP_BASE_PATH = configuredBasePath === '/'
  ? ''
  : configuredBasePath.replace(/\/$/, '');

export function withBasePath(path: string): string {
  if (!APP_BASE_PATH || !path.startsWith('/')) return path;
  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) return path;
  return `${APP_BASE_PATH}${path}`;
}

/**
 * Keep existing same-origin API calls working when Next.js is mounted below a
 * subpath. External requests and already-prefixed requests are left untouched.
 */
export function installBasePathFetch(): void {
  if (typeof window === 'undefined' || !APP_BASE_PATH) return;

  const appWindow = window as typeof window & { __houseflowBasePathFetch?: boolean };
  if (appWindow.__houseflowBasePathFetch) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') return originalFetch(withBasePath(input), init);
    return originalFetch(input, init);
  }) as typeof window.fetch;
  appWindow.__houseflowBasePathFetch = true;
}
