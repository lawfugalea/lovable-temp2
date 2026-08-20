import assert from 'node:assert/strict'
import test from 'node:test'
import { createRateLimit, getClientIP } from '../src/lib/rate-limiter'

function request() {
  return {
    headers: { 'x-forwarded-for': '203.0.113.10' },
    connection: {},
    socket: {},
  } as any
}

function response() {
  const result: any = {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: null,
    setHeader(name: string, value: string) { result.headers[name] = value },
    status(code: number) { result.statusCode = code; return result },
    json(body: unknown) { result.body = body; return result },
  }
  return result
}

test('rate limiters keep independent counters and limits', async () => {
  const strict = createRateLimit({ windowMs: 60_000, maxRequests: 1 })
  const lenient = createRateLimit({ windowMs: 60_000, maxRequests: 2 })

  assert.equal(await strict(request(), response()), true)
  assert.equal(await strict(request(), response()), false)
  assert.equal(await lenient(request(), response()), true)
  assert.equal(await lenient(request(), response()), true)
  assert.equal(await lenient(request(), response()), false)
})

test('Cloudflare client address takes precedence over spoofable forwarded headers', () => {
  const req = request()
  req.headers['cf-connecting-ip'] = '198.51.100.22'
  req.headers['x-forwarded-for'] = '203.0.113.99'
  assert.equal(getClientIP(req), '198.51.100.22')
})
