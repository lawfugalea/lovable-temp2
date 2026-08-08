import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { parseOnboardingPatch } from '@/lib/onboarding-state'
import { buildOnboardingState, onboardingUserSelection, serializeOnboardingUser } from '@/lib/onboarding-status'
import { requireMobileIdentity } from '@/lib/mobile-auth'

/**
 * First-run state for the app, sharing the browser's implementation exactly.
 *
 * Note this route deliberately does not require a household: someone who signs
 * up on their phone has none yet, and describing that is the entire purpose.
 * Every other mobile route refuses without one.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const state = await buildOnboardingState(identity.userId)
    if (!state) return res.status(401).json({ error: 'Unauthorized' })
    return res.status(200).json(state)
  }

  if (req.method === 'PATCH') {
    const parsed = parseOnboardingPatch(req.body ?? {})
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const user = await prisma.user.update({
      where: { id: identity.userId },
      data: parsed.data,
      select: onboardingUserSelection,
    })
    return res.status(200).json({ user: serializeOnboardingUser(user) })
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
