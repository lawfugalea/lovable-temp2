/**
 * Validation for onboarding state writes.
 *
 * Pure — imports only the step registry, so the unit tests can exercise it
 * without dragging Prisma and next-auth into the test process.
 */

import { isTourStepId } from './onboarding-tour'

export interface OnboardingPatch {
  tourStepId?: string | null
  tourCompleted?: boolean
  checklistDismissed?: boolean
}

export type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

/**
 * Turn a PATCH body into a Prisma update. Arbitrary strings must never reach the
 * tourStepId column, so unknown ids are rejected rather than stored.
 */
export function parseOnboardingPatch(body: unknown, now: Date = new Date()): ParseResult {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Body must be an object' }
  const patch = body as OnboardingPatch
  const data: Record<string, unknown> = {}

  if (patch.tourStepId !== undefined) {
    if (patch.tourStepId === null) {
      data.tourStepId = null
    } else if (isTourStepId(patch.tourStepId)) {
      data.tourStepId = patch.tourStepId
    } else {
      return { ok: false, error: 'Unknown tour step' }
    }
  }

  if (patch.tourCompleted !== undefined) {
    if (typeof patch.tourCompleted !== 'boolean') {
      return { ok: false, error: 'tourCompleted must be a boolean' }
    }
    if (patch.tourCompleted) {
      data.tourCompletedAt = now
      // Finishing clears the resume point so a later replay starts from the top.
      data.tourStepId = null
    } else {
      data.tourCompletedAt = null
    }
  }

  if (patch.checklistDismissed !== undefined) {
    if (typeof patch.checklistDismissed !== 'boolean') {
      return { ok: false, error: 'checklistDismissed must be a boolean' }
    }
    data.checklistDismissedAt = patch.checklistDismissed ? now : null
  }

  if (Object.keys(data).length === 0) return { ok: false, error: 'Nothing to update' }
  return { ok: true, data }
}
