# Meta advertising measurement

What Clankeep reports to Meta, and how to switch it on. With none of the
environment variables set, no pixel loads and no conversion is reported — this is
off until deliberately configured.

## Why both a pixel and the Conversions API

The browser pixel is blocked by ad blockers and by iOS tracking prevention, so on
its own it reports a partial and biased sample of signups, and campaigns optimise
towards whatever that sample happens to contain. The Conversions API reports the
same conversions from our own server, where nothing can block them. Both are used,
sharing an `event_id` per conversion so Meta counts one signup once.

## What is sent, and when

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `PageView` | browser | public marketing pages | page URL, IP, user agent, Meta cookies |
| `CompleteRegistration` | browser + server | successful signup | the above, plus a SHA-256 hash of the email |
| `Purchase` | server | `checkout.session.completed` | hashed email, amount, currency, Meta cookies |

Never sent: the email address itself, anything inside a household account, and
anything at all from the signed-in app. The pixel is mounted only on the public
funnel — landing, register, login and the legal pages — because campaigns need the
path from advert to subscription and nothing beyond it.

## Consent

Nothing is reported unless the visitor accepted non-essential cookies, on either
side of the wire. A hashed email is still personal data.

Consent lives in `localStorage` for the browser and is mirrored into a
`clankeep-consent` cookie so API routes can see it; `hasAdConsent()` fails closed
on a missing, malformed or declined value. A subscription is confirmed by a Stripe
webhook with no browser attached, so the consent in force at checkout is carried
through the Checkout session's metadata rather than persisted against the user —
which also means the consent recorded is the consent that applied at the moment of
the purchase.

The privacy policy documents Meta as a recipient, what it receives, and the
transfer to the United States. If what is sent changes, that text changes with it.

## Setting it up

1. In Meta Events Manager, create a dataset (pixel) and copy its ID.
2. Under that dataset, generate a **Conversions API access token**. It is a
   system-user credential: it goes in `META_CONVERSIONS_TOKEN` and must never be
   given a `NEXT_PUBLIC_` prefix.
3. Set the variables in `.env.deploy`:

```dotenv
NEXT_PUBLIC_META_PIXEL_ID=your-pixel-id
META_CONVERSIONS_TOKEN=your-system-user-token
# Optional: while testing, route events to the Events Manager test console
# instead of live reporting. Take the code from Events Manager → Test events.
META_TEST_EVENT_CODE=TEST12345
```

4. Deploy. `NEXT_PUBLIC_META_PIXEL_ID` is inlined at build time, so it needs a
   rebuild rather than only a restart.

## Verifying it

With `META_TEST_EVENT_CODE` set, Events Manager → Test events shows arrivals live.

- Open a public page, accept cookies, and expect `PageView`.
- Complete a signup, and expect one `CompleteRegistration` — one, not two. Two
  means the shared `event_id` is not reaching both sides.
- Check "Event match quality" for `CompleteRegistration`: it should reflect the
  hashed email plus IP and user agent.

Before consent there must be no request to `facebook.net` or `facebook.com` at
all. That is asserted in `tests/meta-measurement.test.ts` and was verified in a
browser.

## The CSP

Meta's documented snippet is an inline `<script>`. This app's policy allows exactly
one hashed inline script (next-themes' flash-prevention snippet) and
`scripts/check-csp-theme-hash.mjs` fails the deploy on any other, so
`src/components/MetaPixel.tsx` loads `fbevents.js` as a plain `src` script and
calls `fbq` afterwards. Pasting Meta's snippet in would be blocked by the browser
and would fail the deploy gate; a test guards against it.

The hosts added to `next.config.js`: `https://connect.facebook.net` in
`script-src`, and `https://www.facebook.com` in `img-src` and `connect-src`.
