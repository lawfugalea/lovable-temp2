import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { revokeMobileSession } from '@/lib/mobile-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  await revokeMobileSession(req.body?.refreshToken)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
