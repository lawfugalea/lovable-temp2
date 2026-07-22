import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import type { MobileLoginRequest, MobileLoginResponse } from '../../../../../../packages/contracts'
import { prisma } from '@/lib/prisma'
import { withApiHandler } from '@/lib/api-handler'
import { clearLoginAttempts, consumeLoginAttempt } from '@/lib/rate-limiter'
import { createMobileSession } from '@/lib/mobile-auth'
import { mobileBootstrap } from '@/lib/mobile-bootstrap'

function clientIp(req: NextApiRequest): string {
  const candidate = req.headers['cf-connecting-ip']
    || req.headers['x-forwarded-for']
    || req.headers['x-real-ip']
    || 'unknown'
  return (Array.isArray(candidate) ? candidate[0] : String(candidate).split(',')[0]).trim()
}

async function handler(req: NextApiRequest, res: NextApiResponse<MobileLoginResponse | { error: string; code?: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const body = (req.body || {}) as Partial<MobileLoginRequest>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || email.length > 254 || !password || password.length > 128) {
    return res.status(400).json({ error: 'A valid email and password are required' })
  }

  const ip = clientIp(req)
  const loginKey = `${ip}:${email}`
  const accountKey = `account:${email}`
  const ipKey = `ip:${ip}`
  if (!consumeLoginAttempt(ipKey) || !consumeLoginAttempt(accountKey) || !consumeLoginAttempt(loginKey)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.', code: 'RATE_LIMITED' })
  }

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' })
  }
  clearLoginAttempts(loginKey)
  clearLoginAttempts(accountKey)

  const [tokens, bootstrap] = await Promise.all([
    createMobileSession({
      user,
      deviceName: typeof body.deviceName === 'string' ? body.deviceName : undefined,
      platform: body.platform,
    }),
    mobileBootstrap(user.id),
  ])
  if (!bootstrap) return res.status(401).json({ error: 'Invalid email or password' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ...tokens, bootstrap })
}

export default withApiHandler(handler)
