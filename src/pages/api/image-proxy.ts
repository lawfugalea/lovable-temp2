import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL required' });
  }
  
  // Security: Only allow smart.com.mt URLs
  if (!url.startsWith('http://www.smart.com.mt/')) {
    return res.status(403).json({ error: 'Forbidden domain' });
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}
