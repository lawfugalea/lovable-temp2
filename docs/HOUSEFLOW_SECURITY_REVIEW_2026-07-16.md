# HouseFlow Security Review - 2026-07-16

## Scope

Reviewed the current working tree and local production deployment, including:

- all Next.js API routes and proxy rules;
- NextAuth credential handling, admin access, household authorization, invite flows, and password policy;
- notes, uploads, shopping, medicine/health, account export, and open-banking/AI data flows;
- Prisma relationships, destructive operations, and cross-household scoping;
- public endpoints, SSRF and redirect boundaries, request-size/CPU abuse, and browser security headers;
- dependency advisories, secret handling, Docker isolation, database exposure, and backups.

## Confirmed fixes

### Sensitive files and backups

- Changed the live `.env` from `0664` to `0600`. It was already ignored by Git and excluded from Docker builds.
- Changed the backup directory from `0775` to `0700` and every existing backup/checksum to `0600`.
- Added `umask 077` and directory permission enforcement to both backup paths.
- Recreated the running backup service with a read-only root filesystem and `no-new-privileges`; a new backup was successfully created as `0600`.
- No private key or recognizable provider-token pattern was found in the working tree outside ignored environment configuration.

### Authentication and authorization

- Confirmed private APIs authenticate on the server and scope household, note, medicine, shopping, admin, and finance records before reads or writes.
- Confirmed finance reads require ownership or an explicit account share and management writes require the configured finance owner.
- Debug APIs now require an authenticated configured administrator in every environment.
- Login input is length-bounded before password hashing, and production auth errors no longer log provider metadata.
- Password changes and admin resets now invalidate existing JWT sessions by comparing an encrypted-token password fingerprint with the current bcrypt hash. Pre-hardening sessions are intentionally invalidated on first use.
- New passwords now require at least 12 characters; the operational user-creation script no longer defaults to or prints a weak password.
- Invite links no longer fall back to request-controlled host/proxy headers.

### Injection, browser, and public endpoint defenses

- Added a production Content Security Policy, `object-src 'none'`, `frame-ancestors 'none'`, origin isolation, and cross-domain policy headers.
- Added server-side rich-note validation for unsafe URL protocols, event attributes, excessive nesting, and excessive node counts.
- Escaped invite URLs before inserting them into HTML email.
- Added rate limiting to public price search/estimation, invite validation, and the image proxy.
- Bounded price-estimation batch count and input length, preventing unauthenticated CPU/database amplification.
- Fixed rate limiters with different limits/windows accidentally sharing counters and bounded their in-memory key stores.
- Confirmed the image proxy has a strict host allowlist, redirect revalidation, timeout, byte limit, MIME allowlist, and file-signature validation.

### Container isolation

- The app now runs as a non-root user with a read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, a PID limit, and a restricted writable `/tmp`.
- The database remains bound to `127.0.0.1`; the application remains bound to the private `10.77.0.1` interface.
- The public URL is additionally protected at the Cloudflare edge with HTTP Basic authentication.

## Verification

- `npm audit` (production and all dependencies): 0 known vulnerabilities.
- `npm test`: 36/36 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings.
- `npm run build`: passed.
- `docker compose --env-file .env.deploy config --quiet`: passed.
- Isolated hardened-container smoke test: health endpoint passed, CSP present, debug endpoint returned 401, root filesystem rejected writes, `/tmp` remained writable, and the configured capability/security restrictions were present.
- Session-revocation smoke test: a legacy JWT was rejected by both the session and protected APIs, while a current password-bound JWT was accepted.
- Backup runtime test: service healthy and newly created backup/checksum are `0600`.

## Deployment

The tested app and backup service configurations were deployed locally on 2026-07-16. The app, database, and backup containers were running after deployment, and the app/database health checks were healthy. Existing pre-hardening app sessions require one fresh login.

## Residual risks and follow-up

1. **MFA:** The app has no second factor. Keep the Cloudflare access layer enabled and consider passkeys/TOTP before widening access.
2. **Distributed rate limiting:** Limits are in memory and therefore reset on restart and do not coordinate across replicas. Move authentication and public-endpoint limits to Redis or another shared store before horizontal scaling. Ensure the edge overwrites forwarded-IP headers.
3. **Encryption and least privilege:** Sensitive health, note, banking, provider-session, and backup data are not application-level encrypted. The app and migrations also use the same database-owner credential. Use disk/backup encryption, separate runtime and migration roles, and consider field encryption for provider session IDs.
4. **Uploaded note images:** Filenames have 128 bits of randomness and require a valid login, but the upload endpoint does not persist note/household ownership metadata. A logged-in holder of a leaked image URL could retrieve it. Add an attachment table linked to a note and enforce note authorization on download.
5. **CSP strictness and HSTS:** The Pages Router requires an inline-script allowance in the current CSP. Move to nonce-based CSP when practical. Enable HSTS at the HTTPS edge after confirming every subdomain/route is HTTPS-only; it was not forced at the app because the private operational endpoint is HTTP.
6. **Potential prior local disclosure:** Only one interactive OS account is present, and no evidence of misuse was found. Still rotate secrets/provider keys if untrusted local users or a compromised local service may have accessed the formerly group/world-readable environment or backups.
7. **Dependency maintenance:** The registry reports no known vulnerability, but several non-security minor/major upgrades are available (notably Tiptap and Prisma). Upgrade them in tested batches rather than combining them with this hardening change.
