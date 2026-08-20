import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { parseOnboardingPatch } from '@/lib/onboarding-state'
import { buildOnboardingState, onboardingUserSelection, serializeOnboardingUser } from '@/lib/onboarding-status'

/**
 * Onboarding + first-run state for the signed-in browser user.
 *
 * The state itself lives in `@/lib/onboarding-status` so the app's route cannot
 * describe first run differently from the website.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const state = await buildOnboardingState(userId)
    if (!state) return res.status(401).json({ error: 'Unauthorized' })
    return res.status(200).json(state)
  }

  if (req.method === 'PATCH') {
    const parsed = parseOnboardingPatch(req.body ?? {})
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    // Deliberately no rejectDemoUser: the tour is exactly what a demo user
    // should get, and this state is per-user and purely cosmetic.
    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: onboardingUserSelection,
    })
    return res.status(200).json({ user: serializeOnboardingUser(user) })
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
