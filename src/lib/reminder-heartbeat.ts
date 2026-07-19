/**
 * In-process heartbeat for the medicine-reminder pipeline so `/api/health` can
 * report whether reminders are actually flowing. The reminder worker polls the
 * dispatch endpoint every ~60s; each successful poll updates this timestamp.
 * In-memory is sufficient for the single-instance deployment (it resets on
 * restart and is repopulated within one poll interval).
 */

const STALE_MS = 5 * 60 * 1000

let lastRunAt: number | null = null

export function markReminderRun(): void {
  lastRunAt = Date.now()
}

export function getReminderStatus() {
  const configured = Boolean(process.env.REMINDER_WORKER_SECRET?.trim())
  const vapidConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim(),
  )
  // "Stale" only means something once the worker secret is configured; if it
  // isn't, reminders are intentionally off and there is nothing to be stale.
  const stale = configured && (lastRunAt === null || Date.now() - lastRunAt > STALE_MS)
  return {
    configured,
    vapidConfigured,
    lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
    stale,
  }
}
