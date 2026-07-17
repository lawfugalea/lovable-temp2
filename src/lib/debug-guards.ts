import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/admin-helpers';

export async function requireDebugAccess(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  try {
    await requireAdmin(req);
    return true;
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Debug access denied' });
    return false;
  }
}
