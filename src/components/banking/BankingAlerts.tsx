/**
 * Notices and errors for the banking pages.
 *
 * Announced, which they previously were not: a failed sync updated a paragraph
 * of text that no screen reader had any reason to revisit. Errors are assertive
 * because they interrupt what the reader was about to do; notices are polite.
 */
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function BankingAlerts({ notice, error }: { notice?: string | null; error?: string | null }) {
  return (
    <>
      <div aria-live="polite">
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}
      </div>
      <div aria-live="assertive" role="status">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </>
  )
}
