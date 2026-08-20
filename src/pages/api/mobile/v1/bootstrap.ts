import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileBootstrapResponse } from '../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileBootstrap } from '@/lib/mobile-bootstrap'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileBootstrapResponse | { error: string; code?: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const bootstrap = await mobileBootstrap(identity.userId)
  if (!bootstrap) return res.status(401).json({ error: 'Unauthorized' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(bootstrap)
}

export default withApiHandler(handler)
