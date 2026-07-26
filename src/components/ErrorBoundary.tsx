import React from 'react'
import { withBasePath } from '@/lib/base-path'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render-time exceptions anywhere below it.
 *
 * Without this, a single throw in any client component unmounts the whole tree
 * and drops the user on React's blank screen — jarring in an installed PWA that
 * otherwise looks like a native app, and it takes the navigation with it so
 * there is no way back except the browser's reload.
 *
 * Deliberately a class: error boundaries have no hook equivalent.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Goes to the browser console rather than lib/observability: that module's
    // structured record is read by the server's log drain, and this runs on the
    // client where nothing collects it.
    console.error('[clankeep] render error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow">
          <h1 className="font-display text-lg font-semibold text-foreground">
            Something went wrong on this screen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your data is safe — this is a display problem, not a saving problem.
            Reloading usually clears it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              Reload
            </button>
            {/* A full load, not a client transition: the router is part of the
                tree that just failed, so it cannot be trusted to navigate. */}
            <a
              href={withBasePath('/dashboard')}
              className="min-h-11 rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Back to overview
            </a>
          </div>
        </div>
      </main>
    )
  }
}
