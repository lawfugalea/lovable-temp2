import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { registerSrcAlias } from './helpers/api-harness'

registerSrcAlias()

const conversions = require('../src/lib/meta/conversions') as typeof import('../src/lib/meta/conversions')
const checkout = require('../src/lib/meta/checkout') as typeof import('../src/lib/meta/checkout')
// Required after registerSrcAlias() has patched module resolution, so the '@/'
// imports inside these modules resolve.
const eventId = require('../src/lib/meta/event-id') as typeof import('../src/lib/meta/event-id')

function request(cookie?: string, headers: Record<string, string> = {}) {
  return {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
    socket: { remoteAddress: '203.0.113.9' },
    body: {},
  } as never
}

test('advertising measurement fails closed without explicit consent', () => {
  // The single most important property here: no cookie, an unrelated cookie, a
  // declined choice, or a malformed value must all mean "do not report".
  assert.equal(conversions.hasAdConsent(request()), false)
  assert.equal(conversions.hasAdConsent(request('other=1')), false)
  assert.equal(conversions.hasAdConsent(request('clankeep-consent=declined')), false)
  assert.equal(conversions.hasAdConsent(request('clankeep-consent=')), false)
  assert.equal(conversions.hasAdConsent(request('clankeep-consent=ACCEPTED')), false)
  assert.equal(conversions.hasAdConsent(request('clankeep-consent=accepted')), true)
  // Alongside other cookies, which is how it will actually arrive.
  assert.equal(conversions.hasAdConsent(request('_fbp=fb.1.2.3; clankeep-consent=accepted; x=y')), true)
})

test('an email leaves only as a hash Meta can match but not read', () => {
  const expected = createHash('sha256').update('person@example.com').digest('hex')
  // Meta requires the value trimmed and lowercased before hashing, so these all
  // have to agree or the match silently fails.
  assert.equal(conversions.hashEmail('person@example.com'), expected)
  assert.equal(conversions.hashEmail('  Person@Example.COM  '), expected)
  assert.notEqual(conversions.hashEmail('person@example.com'), 'person@example.com')
  assert.equal(conversions.hashEmail(''), null)
  assert.equal(conversions.hashEmail('not-an-email'), null)
  assert.equal(conversions.hashEmail(null), null)
})

test('match signals are taken from the request, and the proxy chain is respected', () => {
  const data = conversions.userDataFromRequest(
    request('_fbp=fb.1.100.200; _fbc=fb.1.100.click', {
      'x-forwarded-for': '198.51.100.7, 10.0.0.1',
      'user-agent': 'Mozilla/5.0 (test)',
    }),
    'person@example.com',
  )
  assert.equal(data.clientIpAddress, '198.51.100.7')
  assert.equal(data.clientUserAgent, 'Mozilla/5.0 (test)')
  assert.equal(data.fbp, 'fb.1.100.200')
  assert.equal(data.fbc, 'fb.1.100.click')
  // Carried in the clear only as far as the hashing boundary.
  assert.equal(data.email, 'person@example.com')
})

test('reporting is a no-op when Meta is not configured', async () => {
  const previousId = process.env.META_PIXEL_ID
  const previousToken = process.env.META_CONVERSIONS_TOKEN
  delete process.env.META_PIXEL_ID
  delete process.env.META_CONVERSIONS_TOKEN
  try {
    // Consent given, but nothing to send to: resolves false rather than throwing,
    // so a signup is never affected by advertising configuration.
    const sent = await conversions.reportConversion(request('clankeep-consent=accepted'), {
      eventName: 'CompleteRegistration',
      eventId: 'test-event-id',
      userData: { email: 'person@example.com' },
    })
    assert.equal(sent, false)
  } finally {
    if (previousId === undefined) delete process.env.META_PIXEL_ID
    else process.env.META_PIXEL_ID = previousId
    if (previousToken === undefined) delete process.env.META_CONVERSIONS_TOKEN
    else process.env.META_CONVERSIONS_TOKEN = previousToken
  }
})

test('a client-supplied event id is validated before it reaches an outbound payload', () => {
  assert.equal(eventId.safeEventId('abcd1234-5678-90ab'), 'abcd1234-5678-90ab')
  // Anything else earns a server-generated id rather than being passed through.
  for (const hostile of ['<script>', 'a', 'x'.repeat(200), '../../etc', 'has space', 42, null, undefined, {}]) {
    const result = eventId.safeEventId(hostile)
    assert.notEqual(result, hostile)
    assert.match(result, /^[A-Za-z0-9-]{8,64}$/)
  }
})

test('checkout carries consent through Stripe and reads back closed', () => {
  const consented = checkout.checkoutMeasurementMetadata(request('clankeep-consent=accepted; _fbp=fb.1.9.9'))
  assert.equal(consented.adConsent, 'accepted')
  assert.equal(consented.fbp, 'fb.1.9.9')
  assert.match(consented.metaEventId, /^[A-Za-z0-9-]{8,64}$/)

  // Without consent the Meta cookies are not carried at all, so a later webhook
  // has nothing to report with even if the consent flag were misread.
  const declined = checkout.checkoutMeasurementMetadata(request('_fbp=fb.1.9.9'))
  assert.equal(declined.adConsent, 'declined')
  assert.equal(declined.fbp, undefined)

  assert.equal(checkout.readCheckoutMeasurement(consented).consented, true)
  assert.equal(checkout.readCheckoutMeasurement(declined).consented, false)
  assert.equal(checkout.readCheckoutMeasurement(null).consented, false)
  assert.equal(checkout.readCheckoutMeasurement({}).consented, false)
  // A missing id still yields a usable one rather than an empty event.
  assert.match(checkout.readCheckoutMeasurement({}).eventId, /^[A-Za-z0-9-]{8,64}$/)
})

test('the pixel adds no inline script, and the CSP admits exactly the hosts it needs', () => {
  // Meta's documented snippet is inline. This policy allows one hashed inline
  // script and the deploy gate fails on any other, so the library must be loaded
  // by src — this test is what stops someone pasting the snippet back in.
  const pixel = readFileSync(join(process.cwd(), 'src/components/MetaPixel.tsx'), 'utf8')
  assert.match(pixel, /src="https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js"/)
  assert.doesNotMatch(pixel, /dangerouslySetInnerHTML/)
  // And it must stay behind consent.
  assert.match(pixel, /consent === 'accepted'/)

  const config = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8')
  const directive = (name: string) => config
    .split('\n')
    .find(line => line.includes(`${name} 'self'`)) ?? ''
  assert.match(directive('script-src'), /https:\/\/connect\.facebook\.net/)
  assert.doesNotMatch(directive('script-src'), /unsafe-inline/)
  assert.match(directive('img-src'), /https:\/\/www\.facebook\.com/)
  assert.match(directive('connect-src'), /https:\/\/www\.facebook\.com/)
})

test('consent is mirrored to a cookie so server-side reporting can be gated', () => {
  // localStorage is invisible to an API route; without the cookie the server
  // could never tell consent from its absence.
  const source = readFileSync(join(process.cwd(), 'src/lib/cookie-consent.ts'), 'utf8')
  assert.match(source, /CONSENT_COOKIE = 'clankeep-consent'/)
  assert.match(source, /SameSite=Lax/)
  assert.match(source, /document\.cookie/)
})
