/**
 * The bank connection itself: how it is doing, and how to fix it when it is not.
 *
 * Amber and red are kept for states the household can act on — reconnect needed,
 * sync failed, consent about to lapse. A daily access cap is none of those, so it
 * appears in the same amber-free way an informational note does.
 */
import { Link2, Loader2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { bankDisplayName } from '@/lib/finance/bank-name'
import { longDate, relativeSync } from '@/lib/finance/format'
import type { Connection, ConnectionStatus } from './types'

export const CONSENT_WARNING_MS = 14 * 24 * 60 * 60 * 1000

function tone(status: ConnectionStatus): { label: string; className: string } {
  if (status === 'ACTIVE') return { label: 'Connected', className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900' }
  if (status === 'REAUTH_REQUIRED') return { label: 'Reconnect required', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' }
  if (status === 'ERROR') return { label: 'Sync problem', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' }
  return { label: 'Connecting', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' }
}

export type ConnectionsBlockProps = {
  connections: Connection[]
  action: string | null
  clock: number
  onReconnect: (connectionId: string) => void
  onDisconnect: (connection: Connection) => void
}

export function ConnectionsBlock({ connections, action, clock, onReconnect, onDisconnect }: ConnectionsBlockProps) {
  if (!connections.length) return null

  return (
    <section aria-labelledby="banking-connections" className="space-y-3">
      <h2 id="banking-connections" className="font-display text-xl font-semibold tracking-tight">Connection</h2>
      {connections.map(connection => {
        const badge = tone(connection.status)
        const expiry = connection.consentExpiresAt ? new Date(connection.consentExpiresAt) : null
        const expiringSoon = expiry !== null && expiry.getTime() - clock < CONSENT_WARNING_MS
        return (
          <Card key={connection.id} className={connection.status === 'ACTIVE' ? 'hover:-translate-y-0' : 'border-amber-200 hover:-translate-y-0 dark:border-amber-900'}>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-module-finances/10 text-module-finances ring-1 ring-module-finances/15">
                  <Link2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{bankDisplayName(connection.aspspName)}</h3>
                    <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{relativeSync(connection.lastSyncedAt, clock)}</span>
                    {connection.consentExpiresAt && (
                      <span className={expiringSoon ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>
                        Consent until {longDate(connection.consentExpiresAt)}
                      </span>
                    )}
                  </div>
                  {connection.syncError && (
                    <p className={`mt-2 text-sm ${connection.status === 'ACTIVE' ? 'text-muted-foreground' : 'text-red-700 dark:text-red-300'}`}>
                      {connection.syncError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(connection.status === 'REAUTH_REQUIRED' || connection.status === 'ERROR' || expiringSoon) && (
                  <Button size="sm" variant="outline" disabled={Boolean(action)} onClick={() => onReconnect(connection.id)}>
                    {action === `reconnect:${connection.id}` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Reconnect
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  disabled={Boolean(action)}
                  onClick={() => onDisconnect(connection)}
                >
                  {action === `disconnect:${connection.id}`
                    ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    : <Trash2 className="mr-1 h-3 w-3" />}
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
