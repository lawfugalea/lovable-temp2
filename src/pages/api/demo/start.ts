import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { createRateLimit } from '@/lib/rate-limiter'
import { demoModeEnabled, purgeExpiredDemoUsers } from '@/lib/demo'
import { createDemoHousehold } from '@/lib/demo-seed'

// Seeding a demo household is expensive; keep it to a handful per IP per hour.
const demoRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Hidden entirely unless the deployment opted in.
  if (!demoModeEnabled()) return res.status(404).json({ error: 'Not found' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!(await demoRateLimit(req, res))) return

  try {
    await purgeExpiredDemoUsers().catch(() => 0)
    const credentials = await createDemoHousehold()
    res.setHeader('Cache-Control', 'no-store')
    // One-time credentials: the client signs in with them immediately.
    return res.status(201).json(credentials)
  } catch (error) {
    console.error('[demo] failed to create demo household', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Could not start the demo right now' })
  }
}

export default withApiHandler(handler)
