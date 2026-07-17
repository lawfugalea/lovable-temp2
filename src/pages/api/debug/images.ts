import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

import { requireDebugAccess } from '@/lib/debug-guards';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireDebugAccess(req, res))) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get a few sample products with images
    const products = await prisma.priceProduct.findMany({
      where: {
        imageUrl: { not: null },
        sourceUrl: { contains: 'smart.com.mt' },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        sourceUrl: true,
      },
      take: 5,
    });

    return res.status(200).json({ 
      products,
      domains: products.map(p => {
        try {
          return new URL(p.imageUrl!).hostname;
        } catch {
          return 'invalid-url';
        }
      })
    });
  } catch (err: any) {
    console.error('debug images error', err);
    return res.status(500).json({ error: err.message });
  }
}
