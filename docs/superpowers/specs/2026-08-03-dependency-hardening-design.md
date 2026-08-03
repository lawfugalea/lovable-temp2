# Dependency hardening and upgrade pass — design

Date: 2026-08-03
Status: approved
Workstream: 1 of 4 in the public-launch readiness gate

## Why now

Clankeep is heading for a public paid launch: the repo already carries Stripe
billing, entitlements, a Meta conversions pixel, demo mode, and published legal
pages, while the security documentation still describes a private app sitting
behind Cloudflare HTTP Basic authentication. When that barrier comes off,
untrusted strangers reach an application holding children's health journals and
PSD2 bank transaction history.

The dependency surface has four live advisories, one of them critical. Every
one has an in-range fix, so there is no reason for them to survive another
week. This workstream clears them, refreshes the rest of the in-range tree,
and installs the CI gates that stop the same drift recurring.

Launch timing is readiness-gated rather than date-gated. The readiness gate is
recorded at the end of this document so "when we feel ready" has criteria
behind it.

## Scope

In scope: in-range dependency upgrades, a committed verification stack, two CI
gates, and a written decision for every deferred major.

Out of scope, each its own later spec: multi-factor authentication,
application-level field encryption, split database roles, observability and
alerting, React 19, Prisma 7, Tailwind 4.

## Success criteria

Each is demonstrated with command output, not asserted:

1. `npm audit` and `npm audit --omit=dev` both report 0 vulnerabilities at
   every severity.
2. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
3. `npm run test:integration` passes against a container built from the patched
   lockfile.
4. Production runs the patched image; `/api/health` is healthy and the security
   posture is unchanged (CSP present, protected endpoints answer 401
   unauthenticated, container still non-root with a read-only root filesystem).
5. CI fails on a new advisory, and on a resolved dependency that has drifted
   behind its own declared range.
6. Every deferred major has a recorded decision.

## Batch 1 — security patches

One commit, four coordinated changes, nothing else riding along, so that a
regression has exactly one candidate cause.

| Change | From | To | Clears |
| --- | --- | --- | --- |
| `next` | 16.2.10 | `^16.2.12` | 9 advisories: SSRF in rewrites via attacker-controlled destination hostname, SSRF in Server Actions on custom servers, two response-body cache-confusion issues, Server Actions DoS, unbounded Edge Server Action payload, image-optimization SVG DoS, unauthenticated disclosure of internal Server Function endpoints, middleware/proxy bypass |
| `eslint-config-next` | 16.2.10 | `^16.2.12` | keeps lint rules in step with the framework |
| `next-auth` | 4.24.14 resolved | `^4.24.15` | **critical**: `getToken()` uncaught exception on a malformed Bearer authorization header (CVSS 7.5); email normaliser validating before Unicode normalisation, allowing a homoglyph `@` bypass; OAuth state/nonce/PKCE cookies not bound to the issuing provider |
| `postcss` — direct devDependency **and** the `overrides` entry | 8.5.15 / 8.5.19 | `^8.5.25` in both | attacker-controlled `sourceMappingURL` reading arbitrary `.map` files when `from` is unset |
| `overrides.sharp` (new entry) | 0.34.5 transitive | `^0.35.3` | libvips CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| `overrides.ip-address` (new entry) | 10.2.0 transitive | `^10.4.0` | three SSRF/trust-boundary bypasses via leading-zero octets, CIDR suffixes, and IPv4-mapped addresses; reaches the tree through `puppeteer` |
| `overrides.brace-expansion@1/@2/@5` (new entries) | 1.1.16 / 2.1.1 / 5.0.7 | 1.1.18 / 2.1.4 / 5.0.9 | three DoS advisories; three separate major lines are present, via `eslint`, `tailwindcss`, and `typescript-eslint` respectively |

`ip-address` and `brace-expansion` are development-only, so they never reach the
production tree. They are fixed here anyway because the advisory gate below
covers the full tree, and an exception with no fixed version to wait for would be
a suppression for its own sake.

`next` is pinned with `~16.2.12` rather than `^16.2.12`. The registry's `latest`
tag moved to 16.3.0 during this work, and a caret range silently took the minor
bump — a larger blast radius than a security patch warrants. The advisory fix
line is 16.2.11, so the tilde range clears every advisory while keeping the
change to a patch. `eslint-config-next` is pinned the same way to stay in step.
16.3.0 is recorded as a deferred minor below.

### Why `sharp` needs an explicit override

`next@16.2.12` still declares `sharp: ^0.34.5` as an optional dependency, so
the framework bump does not clear the libvips advisories on its own. The
advisory matters here rather than theoretically: `images.remotePatterns` in
`next.config.js` is configured for the supermarket CDNs and five source files
use `next/image`, so libvips decodes remote bytes in the request path.

`sharp` is a native module, and production runs a `linux/musl` container image.
The override must therefore be proven inside the built image, not merely on the
host, which is why the verification stack builds both `app` and `migrate`
rather than testing host `node_modules`.

### Why the `next-auth` bump needs care

The 4.24.15 release changes how email addresses are canonicalised. Login and
invitation acceptance both compare email addresses, so the credential path and
the invite path must be exercised rather than assumed. A pre-deploy read-only
query establishes the blast radius: any account whose stored email differs from
its Unicode-normalised form could find its login comparison changed. The
expected answer is zero rows; if it is not, the affected users are known by
name before the deploy rather than discovered from a support message.

## Batch 2 — in-range refresh

A separate commit, after Batch 1 is deployed and quiet.

The 17 Radix UI packages to their current 1.x/2.x releases; all 20 Tiptap
packages 3.28.0 to 3.29.2; `stripe` 22.4.0; `resend` 6.18.1; `swr` 2.5.0;
`date-fns` 4.4.0; `motion` 12.43.0; `typescript` 5.9.3; `autoprefixer` 10.5.4;
`bcryptjs` 3.0.3; `playwright` 1.62.1; `pretty-bytes` 7.1.1; `tailwindcss`
3.4.19; `tailwind-merge` 2.6.1; `@types/formidable` 3.5.1.

`typescript` 5.2 to 5.9 is the one with teeth: seven minor versions of added
inference precision and strictness against a `strict`-mode codebase. Type
errors it surfaces are to be treated as latent bugs and fixed, not silenced
with `any` or `@ts-expect-error`.

## Verification stack

Production is live at `https://clankeep.com` with no staging copy, and
`scripts/deploy-production.sh` records that a Prisma `migrate dev`/`migrate
reset` against a production URL wiped the database on 2026-07-18. The patched
image is therefore exercised on a throwaway stack first.

The stack uses an empty database migrated from scratch, not a restored
production backup. Restoring real data would clone children's health records
and bank transactions onto the development host, creating a second place for
them to leak from, and neither batch contains a schema migration, so
production-shaped data buys very little here.

### The trap this must defeat

`docker-compose.yml` gives both volumes explicit fixed names:

```yaml
volumes:
  houseflow-postgres-data:
    name: houseflow-postgres-data
  houseflow-uploads:
    name: houseflow-uploads
```

A fixed `name:` defeats Compose's project-name prefixing. Bringing the stack up
with `-p clankeep-verify` alone would attach the verification containers to the
**production database volume** — the same failure class as the 2026-07-18 wipe.
Overriding the volume names is the load-bearing part of this design, not a
detail.

### `docker-compose.verify.yml`

Committed to the repo rather than run ad hoc, so the safety properties are
reviewable and repeatable. It overrides exactly four things:

1. **Volume names** to `clankeep-verify-postgres-data` and
   `clankeep-verify-uploads`.
2. **`env_file`** for `app` and `migrate` to `.env.verify`, never `.env`.
   Production `.env` holds the live Stripe secret key, Resend API key, Enable
   Banking private key, DeepSeek key, VAPID pair, and `NEXTAUTH_SECRET`. The
   verification stack gets synthetic values so that a bug in the patched build
   cannot charge a card, send mail, or reach a real bank connection.
3. **Ports** to `127.0.0.1:3100:3000`, matching the integration harness default
   `HOUSEFLOW_TEST_BASE_URL`, and `127.0.0.1:5435:5432`. Production binds
   `10.77.0.1:8097` and `127.0.0.1:5434`, so there is no collision.
4. **`HOUSEFLOW_BASE_PATH`** left empty, mirroring production, so harness paths
   resolve identically.

Only `db`, `migrate`, and `app` are started, named explicitly — never a bare
`up`. The `backup` service bind-mounts the real backup directory and
`backup-offsite` carries the Cloudflare R2 credentials; neither belongs near a
test stack.

### `scripts/verify-stack.sh`

Refuses to proceed unless all of the following hold, checked against the
resolved configuration from `docker compose -p clankeep-verify config` rather
than against the source YAML:

- every resolved volume name contains `verify`;
- neither production port (app 8097, database 5434) is published;
- no production-only secret — Stripe, Resend, Enable Banking, DeepSeek, Meta,
  VAPID, R2 — has a non-empty value anywhere in the resolved config;
- `NEXTAUTH_SECRET` came from `.env.verify`, confirming which file is actually
  in effect rather than merely last in a merged list;
- every resolved `DATABASE_URL` points at the compose-internal `db` service.

The secret check replaced an earlier draft that grepped the resolved config for
a literal `.env` reference. That check was worthless: Compose folds `env_file`
into `environment` before `config` prints it, so the string never appears
whether the override worked or not. Asserting on values is the only version that
can fail when it should.

`price-sync` is overridden alongside `app` and `migrate` even though the script
never starts it, because `compose config` resolves every service and that one
also reads `.env`. Overriding it is what allows the secret assertion to cover the
whole file rather than an allowlist of trusted services.

Then it builds `app` and `migrate`, migrates the empty database, waits for the
healthcheck, runs `npm run test:integration` against `127.0.0.1:3100`, and runs
the smoke assertions from the 2026-07-16 review: CSP header present,
`/api/debug/session` returns 401, the root filesystem rejects a write, `/tmp`
is writable, and Linux capabilities are dropped. Teardown is `down -v` scoped
to the verification project.

## CI gates

Both added to the existing `verify` job in `.github/workflows/ci.yml`.

**Advisory gate.** `npm audit --audit-level=moderate` over the full tree. This
drift accumulated because nothing watched it; a gate is the only fix that
survives a busy month. Advisories with no available fix are handled by
`audit-exceptions.json`, where every entry carries a mandatory expiry date and
a reason. The gate fails on an expired exception, so a suppression cannot
quietly become permanent.

**Dependency freshness gate.** `npm ci` already fails when `package.json` and
the lockfile disagree, but nothing caught `next-auth` resolving to 4.24.14
while `package.json` declared `^4.24.7`. `scripts/check-dependency-freshness.mjs`
compares each installed version against the newest release that already
satisfies its declared range — `npm outdated`'s `current` versus `wanted` — and
fails on any gap. Versions outside the declared range (React 19, Prisma 7,
Tailwind 4) are reported as deliberate holdbacks rather than failures.

This gate needs registry access: "newest release inside the range" is not
knowable from the lockfile alone. An earlier draft of this design claimed the
check could run offline, which was wrong. CI already needs the registry for
`npm ci`, so this adds no new requirement.

CodeQL and secret scanning are worth having and belong to the isolation and
abuse-controls workstream, not this one.

## Rollout and rollback

Each batch deploys separately through `scripts/deploy-production.sh`, which
already takes a verified backup, checks migration drift on both sides of the
migration step, and builds both `app` and `migrate`.

Neither batch contains a schema migration. Rollback is therefore an image
rollback, never a data restore. This is stated explicitly so that nobody
reaches for the restore runbook under pressure when the cheap path is
available.

Procedure: tag the pre-deploy image `clankeep-app:pre-batch1` (respectively
`pre-batch2`) before building. To roll back, `git revert` the batch commit and
re-run the deploy script; if that is too slow, `docker compose up -d --no-build`
against the tagged image restores the previous build immediately.

Post-deploy checks are the same five smoke assertions the verification stack
runs, against production, plus one authenticated login confirming the
`next-auth` email-normalisation change did not break credential comparison.

## Found while implementing

Four things this design did not anticipate. Each was fixed as part of the work
because each sits inside its blast radius.

**The Compose project name was unpinned.** The stack serving clankeep.com was
created from `/home/ryan/lovable-temp2`, a directory that no longer exists, and
its containers still carry the project name `lovable-temp2`. Compose otherwise
derives the project name from the working directory, so `scripts/deploy-production.sh`
run from `/var/www/clankeep` would have resolved the project `clankeep` and built
a **second, parallel stack**: new containers attached to the same fixed-name
volumes, a second Postgres aimed at the live data directory, and a port clash on
8097. Since this design's rollout step is that script, the next deploy would have
been the first to hit it.

Fixed by pinning `name: ${CLANKEEP_COMPOSE_PROJECT:-lovable-temp2}` at the top of
`docker-compose.yml`, and by adding a preflight to the deploy script that
compares the resolved project against the project actually publishing the app
port and refuses to continue on a mismatch. Renaming the project to `clankeep`
remains available as a deliberate migration; the volume names are fixed, so the
data follows.

**The integration suite had been failing since registration was hardened.**
`/api/register` requires a solved captcha and explicit Terms acceptance;
`scripts/test-critical-workflows.mjs` posted only name, email and password, so it
failed at the first of its 81 assertions. The suite is not in CI, so nothing
reported it. The harness now fetches `/api/captcha/challenge`, solves the
arithmetic the way a person does, and sends `acceptedTerms`. No production
control was weakened to accommodate the test.

**Supermarket price comparison is disabled in production.** Consent is
deny-by-default and `.env.deploy` sets no consented store, so
`/api/shopping/compare` answers 503 in production — while the integration suite
asserts a working comparison and an outsider being refused with 403. Both
assertions were therefore vacuous. The verification stack enables all five
supported stores so the path is exercised; it reads local catalogue tables only,
which are empty on a fresh database, so nothing contacts a supermarket site.
Production configuration was left alone: switching that feature on is a legal
decision about scraping third-party sites, not a dependency-upgrade decision.

**Three live secrets were exposed during this work.** While validating the
overlay, a grep over the whole resolved Compose configuration printed the live
`STRIPE_SECRET_KEY`, the Enable Banking private key, and the `DEEPSEEK_API_KEY`
into an agent transcript — they came from `price-sync`, the one service the
overlay had not yet overridden. The overlay was fixed and the preflight now
prints key names only, never values. **Those three credentials should be treated
as disclosed and rotated.**

## Deferred majors

Recorded so the next reader does not re-derive them:

- **React 18 to 19, `@types/react` 19** — its own cycle. It removes the
  `--legacy-peer-deps` workaround from both the Dockerfile and CI, which is the
  real prize, but it touches 208 components along with Radix, Tiptap, and
  motion peer ranges, plus the `ref`-as-prop and required-`useRef`-argument
  changes. Not something to bundle with a security patch on a repo without
  staging.
- **Prisma 6 to 7** — changes client generation; needs its own verification
  against the migration tree.
- **Tailwind 3 to 4** — a configuration and CSS-engine migration; visual
  regression risk across every page.
- **ESLint 9 to 10** — waits on `eslint-config-next` supporting it.
- **TypeScript 5 to 7** — a different compiler generation; deliberately not
  combined with anything.
- **`lucide-react` 0.344 to 1.x, `tailwind-merge` 2 to 3, `globby` 14 to 16,
  `@types/node` 22 to 26, `puppeteer` 24 to 25** — mechanical but breaking;
  batch them together in a later cycle.
- **Next 16.2 to 16.3** — a framework minor that appeared as `latest` mid-work.
  Deliberately not taken with a security patch; it needs its own verification
  run, and 16.2.12 already carries every advisory fix.

## Public-launch readiness gate

This workstream is the first of four. The remaining three each earn their own
spec; they are placeholders here only so the gate is visible in one place.

1. **Dependency hardening** (this spec) — zero advisories, current in-range
   tree, CI gates holding the line.
2. **Identity hardening** — TOTP second factor with enrolment and recovery
   codes, administrator-account protection, session invalidation on factor
   change. Currently credentials-only; flagged as residual risk 1 on
   2026-07-16 and still open.
3. **Isolation proof and abuse controls** — systematic evidence that no route
   leaks across households, durable shared-store rate limiting and captcha
   (`src/lib/captcha.ts` and `src/lib/rate-limiter.ts` are still per-process
   in-memory while auth limits are already database-backed), signup and
   email-verification abuse defences, Stripe webhook replay safety.
4. **Observability and incident readiness** — `src/lib/observability.ts` is a
   structured-logging stub with no aggregation and no alerting. Needs real
   error aggregation, security-relevant audit logging, a rehearsed restore
   drill, and an on-call runbook, so that a problem affecting paying users
   arrives as a page rather than as a support message.
