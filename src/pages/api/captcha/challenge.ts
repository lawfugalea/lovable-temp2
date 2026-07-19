import type { NextApiRequest, NextApiResponse } from 'next'
import { createCaptcha } from '@/lib/captcha'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { id, question } = createCaptcha()
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ id, question })
}
