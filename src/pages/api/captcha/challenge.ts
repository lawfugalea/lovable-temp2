import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { createCaptcha } from '@/lib/captcha'

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { id, question } = createCaptcha()
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ id, question })
}

export default withApiHandler(handler)
