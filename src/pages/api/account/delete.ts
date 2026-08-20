import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { getUserIdOr401 } from '@/lib/api-guards'
import { rejectDemoUser } from '@/lib/demo'
import { deleteUserAccount } from '@/lib/account-deletion'

/**
 * Self-service account deletion for the browser. The erasure itself lives in
 * `@/lib/account-deletion` so this and the app's route cannot drift apart.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (await rejectDemoUser(res, userId, 'Deleting the account')) return

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const result = await deleteUserAccount(userId, password)
  if (!result.ok) return res.status(result.status).json({ error: result.error })

  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
