import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileShoppingAiApplyResponse } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { applyShoppingAiProposal, ShoppingAiHttpError } from '@/lib/shopping-ai-server'
async function handler(req: NextApiRequest, res: NextApiResponse<MobileShoppingAiApplyResponse | MobileApiError>) { if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }; const identity = await requireMobileIdentity(req, res); if (!identity) return; try { const result = await applyShoppingAiProposal(identity.userId, req.body?.proposalToken, req.body?.operationIds); res.setHeader('Cache-Control', 'private, no-store'); return res.status(200).json(result) } catch (error) { if (error instanceof ShoppingAiHttpError) return res.status(error.status).json({ error: error.message, code: error.code }); throw error } }
export default withApiHandler(handler)
