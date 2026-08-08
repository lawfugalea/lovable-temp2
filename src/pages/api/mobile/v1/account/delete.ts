import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { deleteUserAccount } from '@/lib/account-deletion'
import { rejectDemoUser } from '@/lib/demo'
import { requireMobileIdentity } from '@/lib/mobile-auth'

/**
 * In-app account deletion. App Store review guideline 5.1.1(v) requires any app
 * that offers account creation to offer deletion from inside the app, so this
 * exists alongside the browser route and shares its erasure logic exactly.
 *
 * The user's own mobile sessions are removed by the cascade on the deleted user,
 * so no separate revocation is needed.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  if (await rejectDemoUser(res, identity.userId, 'Deleting the account')) return

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const result = await deleteUserAccount(identity.userId, password)
  if (!result.ok) return res.status(result.status).json({ error: result.error })

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
