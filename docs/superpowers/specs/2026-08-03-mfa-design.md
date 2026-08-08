# Identity hardening: TOTP second factor — design

Date: 2026-08-03
Status: draft, awaiting review
Workstream: 2 of 4 in the public-launch readiness gate

## Why now

Clankeep is credentials-only. One password stands between an attacker and a
household's children's medicine and fever history, their notes, and — for adults
who have connected a bank — PSD2 account-information data. Today that is
tolerable because the public URL sits behind Cloudflare HTTP Basic
authentication and there are three accounts, all known to the operator. It stops
being tolerable the moment signups open to strangers, because the population
then includes people who reuse passwords that are already in breach corpora.

This was recorded as residual risk 1 in
`docs/HOUSEFLOW_SECURITY_REVIEW_2026-07-16.md` and is still open.

## What a second factor does and does not buy

Worth stating plainly, so the work is not oversold:

**Fixes:** credential stuffing, password reuse, a phished or keylogged password
used from somewhere else, and an attacker who reads a password out of a support
message or a screenshot.

**Does not fix:** a stolen session cookie or mobile refresh token, malware on the
user's own device, a phishing page that proxies the code in real time (TOTP is
not phishing-resistant — passkeys are, which is why the schema below is shaped to
accept them later), or anything reachable with the operator's database
credentials.

## Scope

In scope: TOTP enrolment and verification for web sign-in, single-use recovery
codes, mandatory enrolment for administrators, invalidation of every existing
session on any credential change, and abuse limits on code entry.

Out of scope, deliberately: passkeys (the credential table is shaped to accept a
second type without a migration rewrite), SMS or email codes (a downgrade, not a
factor), application-level encryption of health and banking fields (workstream 3
or 4), and trusted-device "remember this browser" (a separate decision about
weakening the factor for convenience).

## Assumption to confirm

Enforcement policy was not specified, so this design assumes: **mandatory for
administrators, optional for everyone else at launch**, with the switch to
require it for all accounts kept one configuration change away. The reasoning is
that an administrator account can comp plans and read every household's data
through `/api/admin/*`, so it is the account whose compromise is unrecoverable —
while forcing TOTP on every family member on day one is a signup-funnel cost
before there is any evidence of abuse. Say if you want it mandatory for
everyone; it changes one guard and the enrolment prompt, not the design.

## Data model

Three additive changes. No column is dropped or narrowed, so the migration is
safe to apply ahead of the code that uses it.

```prisma
model UserCredential {
  id         String    @id @default(cuid())
  userId     String
  /// 'TOTP' today. 'PASSKEY' is why this is a table rather than columns on User.
  type       String
  /// AES-256-GCM ciphertext of the TOTP shared secret, never the raw secret.
  secretEnc  String
  /// Highest 30-second time step already accepted, to make replay impossible.
  lastStep   BigInt?
  label      String?
  createdAt  DateTime  @default(now())
  confirmedAt DateTime?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model UserRecoveryCode {
  id        String    @id @default(cuid())
  userId    String
  /// SHA-256 of the code, matching how invite tokens are already stored. The
  /// codes are high-entropy and single-use, so a slow KDF buys nothing here.
  codeHash  String    @unique
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

And on `User`: `securityVersion Int @default(0)` — see session invalidation
below.

### Why the TOTP secret is encrypted

A TOTP secret in plaintext is a second password sitting in the same database as
the first. Anyone who reads the `User` and credential tables — a leaked backup, a
`psql` session, the shared database-owner role this app still uses — could mint
valid codes indefinitely, and the user would never know.

Encryption uses AES-256-GCM with a key from a new `MFA_SECRET_KEY` environment
variable, deliberately *not* `NEXTAUTH_SECRET`: rotating the session secret
should not lock every user out of their authenticator. This is a small, contained
piece of field encryption and is not the broader field-encryption workstream; it
is here because shipping plaintext TOTP secrets would be a new problem rather
than an inherited one.

A backup taken before the key existed cannot be decrypted with it, so key loss
means every user re-enrols. The runbook must say so.

## Sign-in flow

`src/pages/api/auth/[...nextauth].ts` uses a single `CredentialsProvider` with
`session: { strategy: 'jwt' }`. Rather than introduce a partial, half-privileged
session, `authorize` gains one branch:

1. Email and password are checked exactly as they are today.
2. If the account has no confirmed TOTP credential → sign in. Unchanged.
3. If it does and no code was submitted → throw `MFA_REQUIRED`.
4. If a code was submitted → verify it, then sign in.

The login page catches `MFA_REQUIRED`, reveals a six-digit field, and re-submits
email, password and code together. No intermediate token, no cookie that means
"half authenticated", and nothing new for the mobile client to special-case: it
posts the code with the same call. The cost is that the password crosses the wire
twice within one flow, over TLS, which is a smaller risk than a partial-session
credential that has to be stored, expired and revoked.

**Verification rules.** Base32 secret, SHA-1, 6 digits, 30-second step —
compatible with every authenticator app. Accept the previous, current and next
step (±30s) for clock skew. Reject any step less than or equal to `lastStep`,
then advance it, so a code observed over the user's shoulder or in a proxy log
cannot be replayed even inside its window.

**Recovery codes.** Ten codes, generated with `crypto.randomBytes`, shown exactly
once at enrolment, stored as SHA-256. A recovery code is accepted anywhere the
six-digit code is, marked used, and never accepted again. Below three unused
codes the UI nags; regenerating replaces the whole set.

**Nothing left.** A user with no device and no codes needs an administrator to
clear their credential — deliberately not a self-service email reset, because an
email-based bypass reduces the second factor to the security of the mailbox.
This goes in the runbook with an identity-verification step.

## Session invalidation

This is the part with the sharp edge. There are two independent session systems:

- NextAuth JWTs, carrying a `passwordVersion` fingerprint compared against the
  current bcrypt hash (`src/lib/session-security.ts`).
- `MobileSession` rows, each holding a refresh token hash **and its own
  `passwordVersion`** — the mobile client is built in a separate worktree
  (`.codex/MOBILE_HANDOFF.md`) but the table is already in this schema.

If enabling TOTP invalidates only the first, an attacker who already holds a
refresh token keeps full access to the account the user just secured — the exact
scenario the user believed they had closed.

So `passwordVersion` is generalised into `securityVersion`, incremented on any
credential change: password change, admin reset, TOTP enrolment, TOTP removal,
recovery-code regeneration. Both the JWT callback and mobile refresh exchange
compare it and refuse on mismatch. The migration backfills `0` for existing rows,
and the JWT callback treats a token with no `securityVersion` as stale, so every
current session requires one fresh sign-in — the same one-off cost the July
password-fingerprint work already imposed once.

## Abuse limits

A six-digit code is a million guesses, and an attacker who has the password
already only needs the code. `consumeDurable` in `src/lib/rate-limit-store.ts` is
already the database-backed, cross-process counter used for login attempts, so:

- five failed code attempts per account per fifteen minutes, counted separately
  from password attempts so a wrong password cannot exhaust a user's code budget
  or vice versa;
- five failed recovery-code attempts per account per hour, tighter because these
  do not expire;
- enrolment confirmation limited per account, so the enrolment endpoint cannot be
  used as an oracle.

Note the existing deliberate behaviour: `consumeDurable` fails **open** on a
database error, so throttling degrades rather than locking everyone out. That is
right for password attempts and wrong for a second factor — for MFA the check
fails **closed**, because an attacker who can induce database errors should not
get unlimited code guesses.

## Administrator enforcement

`requireAdmin` in `src/lib/admin-helpers.ts` is the single gate for every
`/api/admin/*` route, so enforcement lives there: an administrator without a
confirmed TOTP credential is refused with a specific error the UI turns into
"enrol before continuing". A grace window controlled by `MFA_ADMIN_GRACE_UNTIL`
avoids locking the operator out of their own panel while enrolling; once past
that date, no exceptions.

## Testing

Unit (`node:test`, matching the existing suite):

- code verification: correct code, previous and next step accepted, two steps
  away rejected, replay of an accepted step rejected;
- recovery codes: accepted once, rejected the second time, no code accepted twice
  across a regenerate;
- `securityVersion`: JWT with a stale version rejected; mobile refresh with a
  stale version rejected; token with the field absent treated as stale;
- rate limiting: sixth attempt refused; password and code budgets independent;
  database error fails closed for MFA and open for passwords;
- account export contains neither the encrypted secret nor any recovery hash —
  the export test already asserts no `token` appears; extend it.

Integration (`scripts/test-critical-workflows.mjs`, which now runs in the
verification stack): enrol, sign in with a generated code, confirm a wrong code
is refused, spend a recovery code, confirm it is refused on reuse, and confirm an
administrator without a factor is refused from `/api/admin/*`.

## Rollout

1. Migration first, on its own — additive, so it can be applied and left alone.
2. Ship enrolment while verification is still optional, so the operator and the
   two other accounts can enrol without a lockout risk.
3. Turn on administrator enforcement once the administrator has enrolled.
4. Leave household-wide enforcement as a configuration change for whenever the
   signup population justifies it.

Each step is verified on the throwaway stack from workstream 1 before deploy, and
rollback is an image rollback — except step 1, which needs no rollback because
nothing reads the new columns yet.

## Dependencies on other workstreams

None blocking. It is worth noting that `MFA_SECRET_KEY` becomes a secret worth as
much as the database, so the rotation runbook
(`docs/CLANKEEP_SECRET_ROTATION.md`) gains an entry, and that field encryption
for health and banking data (workstream 3 or 4) can reuse the same key-handling
helper this work introduces.
