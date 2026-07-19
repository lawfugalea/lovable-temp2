import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

/**
 * Wrap an API route handler so an unexpected throw returns a JSON 500 envelope
 * instead of Next.js's default HTML error page — which breaks clients that
 * expect JSON. Handlers that already sent a response before throwing are
 * respected via the `headersSent` guard, and handlers with their own try/catch
 * are unaffected (this wrapper's catch only fires for errors they let escape).
 */
export function withApiHandler(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error(`Unhandled API error in ${req.method ?? 'REQ'} ${req.url ?? ''}:`, error)
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: 'Internal server error' })
      }
    }
  }
}
