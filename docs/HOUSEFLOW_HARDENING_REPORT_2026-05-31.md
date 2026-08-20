# HouseFlow Hardening Report - 2026-05-31

## Summary

Production hardening was completed and deployed for `/home/ryan/lovable-temp2` on `http://10.77.0.1:8097`.

Claude Code CLI was used for bounded security review. It first confirmed the main blocker set, then caught one additional critical issue: `.env` files were not excluded from Docker build context. That was fixed and verified.

## Fixed

- Locked down legacy `/api/state` so it no longer bypasses authenticated `/api/page-state` checks.
- Added production debug guards for debug APIs and middleware protection for `/debug`.
- Replaced hardcoded admin logic in app code with `ADMIN_EMAILS` / `ADMIN_EMAIL` config.
- Added admin status into NextAuth JWT/session and reused it in admin middleware/API/UI checks.
- Reworked note image uploads:
  - storage moved out of `public` into `UPLOAD_DIR` Docker volume,
  - images served only through authenticated API,
  - filename traversal guard,
  - MIME allowlist,
  - magic-byte validation,
  - upload rate limiting,
  - non-root container write permissions fixed.
- Added DB backup process:
  - `scripts/backup-houseflow-db.sh`,
  - Docker `backup` service,
  - backups written to `/home/ryan/backups/houseflow`,
  - SHA256 checksums,
  - retention via `HOUSEFLOW_BACKUP_KEEP_DAYS`.
- Removed noisy/privacy-sensitive `console.log` output from auth, notes, medicine, register, and fever-reading paths.
- Excluded `.env` / `.env.*` from Docker build context and verified built images contain no `/app/.env*` files.
- Updated `jspdf` from `3.0.2` to `4.2.1` to remove the critical audit finding.

## Deployment

Command used:

```bash
cd /home/ryan/lovable-temp2
docker compose --env-file .env.deploy up -d --build app migrate backup
```

Active containers after deploy:

- `lovable-temp2-app-1` - up on `10.77.0.1:8097->3000/tcp`
- `lovable-temp2-db-1` - up and healthy
- `lovable-temp2-backup-1` - up

## Verification

Passed:

```bash
npm run lint
PUPPETEER_SKIP_DOWNLOAD=1 npm run build
docker compose --env-file .env.deploy config
```

Runtime checks after deploy:

- `GET /` -> `200 OK`
- `GET /api/state?householdId=abc&page=test` -> `401 Unauthorized`
- `GET /api/page-state?householdId=abc&page=test` -> `401 Unauthorized`
- `GET /api/debug/session` -> `401 Unauthorized`
- `GET /api/uploads/note-image?file=note-123-abc.jpg` -> `401 Unauthorized`
- App logs show clean startup, no upload permission error after Dockerfile/volume permission fix.
- `docker run --rm --entrypoint sh lovable-temp2-app -lc 'ls -la /app/.env* 2>/dev/null || true'` -> no files.
- `docker run --rm --entrypoint sh lovable-temp2-migrate -lc 'ls -la /app/.env* 2>/dev/null || true'` -> no files.

Manual backup created before deploy:

- `/home/ryan/backups/houseflow/houseflow-20260531T005813Z.sql.gz`

Backup service also created:

- `/home/ryan/backups/houseflow/houseflow-20260531T010126Z.sql.gz`

## Remaining Non-Blocking Items

`npm audit --audit-level=critical --omit=dev` now reports no critical vulnerabilities. It still reports high/moderate advisories in `next`, `postcss`, `uuid`, and `next-auth` where npm's suggested fixes require breaking major changes (`next@16.2.6` and a breaking `next-auth` path). I did **not** force those into production because that risks breaking auth/routing. Treat this as a planned framework upgrade, not an emergency hotfix.

Existing lint warnings remain React hook/image warnings; no lint errors.

## Follow-up - 2026-07-16

The framework upgrade, household isolation work, and invite hardening were
completed and deployed:

- Next.js and its lint configuration were upgraded to 16.2.10.
- Invite bearer tokens are now stored as SHA-256 hashes, are never listed to
  household owners or administrators, and are rotated on resend.
- Invite accept/revoke/resend and member-removal authorization are serialized
  so role changes cannot race a sensitive write.
- Targeted invites enforce the account email; link-only invites, resend,
  revoke, expiry, and replay protection are covered by the critical workflow.
- Note images are bound to notes in the database and served only when the
  current user can access that note. The legacy public upload directory is not
  included in production images.
- Invitation email has a configured required-domain sender and per-owner delivery
  limits. Invite pages use `no-store` and `no-referrer`.
- `npm audit`, lint, type checking, 43 tests, the production build, migration
  upgrade/fresh-install checks, and an isolated end-to-end workflow all pass.
- Migrations were deployed after verified backups. The production app, DB, and
  backup containers are healthy; protected unauthenticated endpoints return
  401 and the external edge retains its additional authentication barrier.

Architectural controls such as end-to-end encryption and MFA are not implied by
these changes. They require separate product and identity-provider decisions.
