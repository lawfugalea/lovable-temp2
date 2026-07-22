import { randomBytes } from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { decode, encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { isAdminEmail } from '@/lib/admin-config'
import { isPasswordVersionCurrent, passwordVersion } from '@/lib/session-security'
import { hashMobileRefreshToken, mobileRefreshSessionId, mobileRefreshTokenMatches } from '@/lib/mobile-auth-core'

export const MOBILE_ACCESS_TOKEN_SECONDS = 15 * 60
const MOBILE_REFRESH_TOKEN_DAYS = 30

type MobileIdentity = {
  userId: string
  sessionId: string
  email: string
  name: string
  isAdmin: boolean
  isDemo: boolean
}

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET
  if (!value) throw new Error('NEXTAUTH_SECRET is not configured')
  return value
}

function refreshExpiry(): Date {
  return new Date(Date.now() + MOBILE_REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)
}

function refreshToken(sessionId: string): string {
  return `${sessionId}.${randomBytes(48).toString('base64url')}`
}

async function accessTokenFor(identity: MobileIdentity, version: string): Promise<string> {
  return encode({
    secret: secret(),
    maxAge: MOBILE_ACCESS_TOKEN_SECONDS,
    token: {
      sub: identity.userId,
      email: identity.email,
      name: identity.name,
      isAdmin: identity.isAdmin,
      isDemo: identity.isDemo,
      passwordVersion: version,
      mobileSessionId: identity.sessionId,
      tokenType: 'mobile-access',
    },
  })
}

export async function createMobileSession(input: {
  user: { id: string; email: string; name: string | null; password: string; isDemo: boolean }
  deviceName?: string
  platform?: string
}) {
  const version = passwordVersion(input.user.password)
  const placeholderHash = hashMobileRefreshToken(randomBytes(64).toString('base64url'))
  const session = await prisma.mobileSession.create({
    data: {
      userId: input.user.id,
      refreshTokenHash: placeholderHash,
      passwordVersion: version,
      deviceName: input.deviceName?.slice(0, 100) || null,
      platform: input.platform === 'ios' || input.platform === 'android' ? input.platform : null,
      expiresAt: refreshExpiry(),
    },
  })
  const nextRefreshToken = refreshToken(session.id)
  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashMobileRefreshToken(nextRefreshToken) },
  })
  const identity: MobileIdentity = {
    userId: input.user.id,
    sessionId: session.id,
    email: input.user.email,
    name: input.user.name ?? input.user.email,
    isAdmin: isAdminEmail(input.user.email),
    isDemo: input.user.isDemo,
  }
  return {
    accessToken: await accessTokenFor(identity, version),
    refreshToken: nextRefreshToken,
    accessTokenExpiresIn: MOBILE_ACCESS_TOKEN_SECONDS,
  }
}

export async function rotateMobileSession(value: unknown) {
  const sessionId = mobileRefreshSessionId(value)
  if (!sessionId || typeof value !== 'string') return null
  const session = await prisma.mobileSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null

  if (!mobileRefreshTokenMatches(value, session.refreshTokenHash)) {
    await prisma.mobileSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    return null
  }
  if (!isPasswordVersionCurrent(session.passwordVersion, session.user.password)) {
    await prisma.mobileSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    return null
  }

  const nextRefreshToken = refreshToken(session.id)
  const updated = await prisma.mobileSession.updateMany({
    where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
    data: {
      refreshTokenHash: hashMobileRefreshToken(nextRefreshToken),
      lastUsedAt: new Date(),
      expiresAt: refreshExpiry(),
    },
  })
  if (updated.count !== 1) return null

  const identity: MobileIdentity = {
    userId: session.user.id,
    sessionId: session.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    isAdmin: isAdminEmail(session.user.email),
    isDemo: session.user.isDemo,
  }
  return {
    accessToken: await accessTokenFor(identity, session.passwordVersion),
    refreshToken: nextRefreshToken,
    accessTokenExpiresIn: MOBILE_ACCESS_TOKEN_SECONDS,
  }
}

export async function revokeMobileSession(value: unknown): Promise<void> {
  const sessionId = mobileRefreshSessionId(value)
  if (!sessionId) return
  await prisma.mobileSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

function bearer(req: NextApiRequest): string | null {
  const raw = req.headers.authorization
  if (typeof raw !== 'string') return null
  const [scheme, token] = raw.split(' ')
  return scheme === 'Bearer' && token ? token : null
}

export async function requireMobileIdentity(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<MobileIdentity | null> {
  const raw = bearer(req)
  if (!raw) {
    res.status(401).json({ error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' })
    return null
  }
  const token = await decode({ token: raw, secret: secret() }).catch(() => null)
  if (token?.tokenType !== 'mobile-access' || typeof token.sub !== 'string' || typeof token.mobileSessionId !== 'string') {
    res.status(401).json({ error: 'Session expired', code: 'MOBILE_SESSION_EXPIRED' })
    return null
  }
  const session = await prisma.mobileSession.findUnique({
    where: { id: token.mobileSessionId },
    include: { user: true },
  })
  if (
    !session ||
    session.userId !== token.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !isPasswordVersionCurrent(token.passwordVersion, session.user.password)
  ) {
    res.status(401).json({ error: 'Session expired', code: 'MOBILE_SESSION_EXPIRED' })
    return null
  }
  return {
    userId: session.user.id,
    sessionId: session.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    isAdmin: isAdminEmail(session.user.email),
    isDemo: session.user.isDemo,
  }
}
