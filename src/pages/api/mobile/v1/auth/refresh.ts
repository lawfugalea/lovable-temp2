import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileRefreshRequest, MobileRefreshResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { rotateMobileSession } from '@/lib/mobile-auth'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileRefreshResponse | { error: string; code?: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const body = (req.body || {}) as Partial<MobileRefreshRequest>
  const tokens = await rotateMobileSession(body.refreshToken)
  if (!tokens) return res.status(401).json({ error: 'Session expired', code: 'MOBILE_SESSION_EXPIRED' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(tokens)
}

export default withApiHandler(handler)
