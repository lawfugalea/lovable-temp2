/**
 * How complete the figures above are.
 *
 * Closed by default and rendered in grey, because completeness is context rather
 * than a problem to act on — reserving amber and red for the states that need a
 * decision is what keeps those colours meaningful.
 */
import { colorForSeries } from '@/components/charts'
import { coverageLabel, money } from '@/lib/finance/format'
import type { CoverageInfo, DataQuality, InternalTransfersSummary } from '@/lib/finance/analytics-types'

export type DataQualityNoteProps = {
  dataQuality: DataQuality
  internalTransfers: InternalTransfersSummary
  coverage: CoverageInfo
  currency: string
}

export function DataQualityNote({ dataQuality, internalTransfers, coverage, currency }: DataQualityNoteProps) {
  const messages = [
    ...(coverage.complete ? [] : [coverageLabel(coverage)]),
    ...dataQuality.messages,
  ]
  if (!messages.length && internalTransfers.matchedPairCount === 0) return null

  return (
    <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        How complete is this?
      </summary>
      <div className="mt-3 space-y-3 text-muted-foreground">
        {internalTransfers.matchedPairCount > 0 && (
          <p>
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: colorForSeries('internal') }}
              aria-hidden="true"
            />
            {internalTransfers.matchedPairCount} transfer{internalTransfers.matchedPairCount === 1 ? '' : 's'} between your own
            accounts ({money(internalTransfers.matchedAmountCents, { currency })}) {internalTransfers.matchedPairCount === 1 ? 'is' : 'are'} left
            out of spending and income — the money moved, it was not earned or spent.
          </p>
        )}
        {messages.length > 0 && (
          <ul className="list-disc space-y-1 pl-5">
            {messages.map(message => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>
    </details>
  )
}
