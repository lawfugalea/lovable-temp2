# Secret rotation runbook

Written 2026-08-03, when three live credentials had to be rotated at once.

## Why this exists

During the dependency-hardening work an agent validated the Docker Compose
overlay by grepping the whole *resolved* configuration and printing it. Three
production secrets came out in that output and were written into an agent
transcript:

- `STRIPE_SECRET_KEY` (a live `sk_live_…` key)
- `ENABLE_BANKING_PRIVATE_KEY_BASE64` (the PSD2 signing key)
- `DEEPSEEK_API_KEY`

They came from the `price-sync` service, the one service the overlay had not yet
overridden. The overlay now covers it and the preflight in
`scripts/verify-stack.sh` prints key names only, never values — but that fixes
the next occurrence, not this one. **A secret that has been printed is a secret
that must be replaced.** No evidence of misuse is not the same as no exposure.

## What reads what

All three live in `.env` (mode `0600`, git-ignored, excluded from the Docker
build context). Three Compose services load that file: `app`, `migrate` and
`price-sync`. Nothing reads them at build time, so rotation needs no rebuild —
only a container recreate, because environment variables are fixed at container
creation and a plain `restart` will keep serving the old values.

| Secret | Read by | Blast radius if unrotated |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `src/lib/billing/stripe.ts` | Full API access to the Stripe account: read customers, create charges and refunds, read payment history |
| `ENABLE_BANKING_PRIVATE_KEY_BASE64` | `src/lib/finance/enable-banking.ts`, `src/lib/finance/config.ts` | Signs PSD2 requests as this application; account-information access to connected bank accounts |
| `DEEPSEEK_API_KEY` | `src/lib/shopping-ai.ts`, `src/lib/finance/deepseek.ts` | Billable API usage on the account, and any data sent through it |

## Order of work

Do Stripe first: it is the only one of the three that can move money.

### 1. Stripe secret key

1. Stripe Dashboard → Developers → API keys.
2. **Roll** the live secret key. Stripe offers an expiry window on the old key —
   choose immediate expiry unless something outside this app uses the same key.
3. Note the new `sk_live_…` value. Do not paste it into a chat window, a ticket,
   or a shell command that will land in history.
4. Edit `.env` in place and replace `STRIPE_SECRET_KEY=`.
5. Check Developers → Webhooks. Rolling the API key does **not** change the
   webhook signing secret, so `STRIPE_WEBHOOK_SECRET` only needs changing if you
   also roll the endpoint secret. If you do, update it in the same edit.

Recreate and verify (see step 4 below). Then confirm in the Stripe Dashboard that
the old key shows no usage after the rotation timestamp, and check the
subscription state of any live customer is still readable in the app.

### 2. Enable Banking signing key

This one is a keypair registered with the provider, not a bearer token, so
replacing it is a two-sided change and the app cannot reach connected accounts in
between. Expect a short window where bank sync fails.

1. Generate a fresh keypair. Keep the private key out of the repository —
   `/keys/` is git-ignored and is where the existing one belongs:

   ```bash
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
     -out /home/ryan/keys/clankeep-enable-banking-$(date -u +%Y%m%d).pem
   chmod 600 /home/ryan/keys/clankeep-enable-banking-*.pem
   ```

2. Register the new public key with Enable Banking and get the application ID it
   is associated with. If the application ID changes, `ENABLE_BANKING_APPLICATION_ID`
   changes too.
3. Base64-encode the private key, single line, and put it in
   `ENABLE_BANKING_PRIVATE_KEY_BASE64`:

   ```bash
   base64 -w0 /home/ryan/keys/clankeep-enable-banking-<date>.pem
   ```

4. Recreate the services, then run the provider-side check that already exists:

   ```bash
   node scripts/check-enable-banking-app.mjs
   ```

5. Revoke the old public key at the provider once the check passes. Existing user
   consents survive a key rotation; if any account shows as needing
   reauthorisation afterwards, that is a user-visible follow-up.

### 3. DeepSeek API key

1. DeepSeek console → API keys → create a new key, then delete the old one.
2. Replace `DEEPSEEK_API_KEY=` in `.env`.
3. Both consumers degrade gracefully when the key is absent or invalid — the AI
   shopping assistant and finance enrichment simply report unavailable rather
   than erroring — so a mistake here is visible but not damaging.

### 4. Apply and verify

Environment is captured at container creation, so recreate rather than restart:

```bash
cd /var/www/clankeep
docker compose --env-file .env.deploy up -d --force-recreate app price-sync
```

`migrate` also reads `.env` but is a one-shot service; it picks up the new values
on its next run.

Then verify:

```bash
curl -fsS http://10.77.0.1:8097/api/health          # expect ok:true
docker compose --env-file .env.deploy logs --tail 30 app
```

Confirm the app has the new values without printing them — compare lengths and
prefixes rather than contents:

```bash
docker exec "$(docker compose --env-file .env.deploy ps -q app)" \
  sh -c 'for k in STRIPE_SECRET_KEY DEEPSEEK_API_KEY ENABLE_BANKING_PRIVATE_KEY_BASE64; do
    eval v=\$$k; echo "$k: ${#v} chars, starts ${v%${v#????}}"; done'
```

Sign in at `https://clankeep.com` and check the billing surface and the banking
page load. Reminder staleness in `/api/health` resets on every app recreate and
clears within about a minute — it is not a rotation failure.

## Rules that would have prevented this

1. Never print a resolved configuration wholesale. Assert on the keys you expect,
   or on value lengths and prefixes.
2. When a check needs to prove a secret is *absent*, test for absence, not for
   presence of a filename. `docker compose config` folds `env_file` into
   `environment`, so grepping for `.env` proves nothing.
3. Treat any secret that reaches a terminal, a log or a transcript as burned,
   regardless of who saw it.
