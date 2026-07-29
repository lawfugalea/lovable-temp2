/**
 * Identifiers that let one conversion be reported twice without being counted
 * twice: the browser sends an event, our server sends the same event, and Meta
 * deduplicates on a matching name and id.
 */

/** A fresh id for a conversion about to be reported from both sides. */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Accept an id supplied by a client only if it looks like one we would have
 * issued. It ends up inside an outbound payload, so it is validated rather than
 * trusted; anything else earns a server-generated id and the browser's event is
 * simply counted separately.
 */
export function safeEventId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : newEventId()
}
