import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { apiRateLimit } from '@/lib/rate-limiter';
import { isSupermarketConsented } from '@/lib/supermarket-consent';

const ALLOWED_HOSTS = new Set(['www.smart.com.mt', 'smart.com.mt']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

function parseAllowedUrl(value: string, base?: URL): URL | null {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchAllowedImage(initial: URL): Promise<Response> {
  let current = initial;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: 'image/*' },
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    const next = location ? parseAllowedUrl(location, current) : null;
    if (!next) throw new Error('Disallowed redirect');
    current = next;
  }
  throw new Error('Too many redirects');
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  if (!response.body) throw new Error('Empty image response');
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw Object.assign(new Error('Image is too large'), { status: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function isValidRasterImage(buffer: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === 'image/gif') {
    const signature = buffer.toString('ascii', 0, 6);
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  return contentType === 'image/webp'
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await apiRateLimit(req, res))) return;
  if (!isSupermarketConsented('smart')) {
    return res.status(404).json({ error: 'Image source is unavailable' });
  }

  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  const url = parseAllowedUrl(rawUrl);
  if (!url) return res.status(403).json({ error: 'Forbidden image URL' });

  try {
    const response = await fetchAllowedImage(url);
    if (!response.ok) return res.status(404).json({ error: 'Image not found' });

    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (!ALLOWED_IMAGE_TYPES.has(contentType) || contentLength > MAX_IMAGE_BYTES) {
      return res.status(415).json({ error: 'Remote resource is not an allowed image' });
    }

    const buffer = await readLimitedBody(response);
    if (!isValidRasterImage(buffer, contentType)) {
      return res.status(415).json({ error: 'Remote resource does not contain a valid image' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(buffer);
  } catch (error: any) {
    console.error('Image proxy error:', error);
    if (error?.status === 413) return res.status(413).json({ error: 'Image is too large' });
    return res.status(502).json({ error: 'Failed to fetch image' });
  }
}

export default withApiHandler(handler)
