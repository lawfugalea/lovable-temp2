#!/usr/bin/env bash
#
# The one supported way to deploy Clankeep production.
#
# Production is the Docker Compose stack in this directory, served publicly at
# https://clankeep.com. The database on 127.0.0.1:5434 is production; there is
# no separate staging copy. That is why this script exists rather than a list of
# commands in a README: the sequence has two traps that are invisible from the
# files.
#
#   1. `docker compose build app` does not rebuild `migrate` — it builds its own
#      image from `target: builder`. This script always builds both.
#   2. `prisma migrate status` reports "up to date" even when production holds a
#      migration the repo has never contained, so drift is checked directly
#      against _prisma_migrations, before and after.
#
# NEVER pass any URL from .env or .env.deploy as a Prisma shadow database, and
# never run `migrate dev` or `migrate reset` here: they are all production URLs,
# and doing so wiped the database on 2026-07-18.
#
#   scripts/deploy-production.sh                # full deploy
#   scripts/deploy-production.sh --check-only   # preflight, change nothing
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHECK_ONLY=0
[[ "${1:-}" == "--check-only" ]] && CHECK_ONLY=1

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

[[ -f .env.deploy ]] || fail ".env.deploy is missing; deploys read it for every service."

step "Repo state"
git --no-pager log --oneline -1
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Warning: tracked files are modified. The build uses the working tree, not HEAD."
  git --no-pager status --short --untracked-files=no
fi

step "Migration tree is well-formed"
node scripts/check-migration-manifest.mjs || fail "prisma/migrations is malformed."

step "Drift check before migrating"
# Exit 1 means drift, 2 means the database was unreachable. Drift is a warning
# here — it is pre-existing and does not block applying pending migrations — but
# an unreachable database is fatal.
set +e
node scripts/check-migration-drift.mjs
DRIFT_STATUS=$?
set -e
[[ $DRIFT_STATUS -eq 2 ]] && fail "Could not reach the production database."
if [[ $DRIFT_STATUS -eq 1 ]]; then
  echo
  echo "Pre-existing drift, continuing. Recover the SQL for the migrations listed above."
fi

if [[ $CHECK_ONLY -eq 1 ]]; then
  step "Check-only: stopping before any change"
  exit 0
fi

step "Backup"
./scripts/backup-houseflow-db.sh || fail "Backup failed. Nothing has been changed."
LATEST_BACKUP="$(ls -t /home/ryan/backups/houseflow/houseflow-*.sql.gz 2>/dev/null | head -1)"
[[ -n "$LATEST_BACKUP" ]] || fail "Backup reported success but produced no file."
( cd "$(dirname "$LATEST_BACKUP")" && sha256sum -c "$(basename "$LATEST_BACKUP").sha256" ) \
  || fail "Backup checksum did not verify."
echo "Verified: $LATEST_BACKUP"

# Both services, always. `migrate` is listed explicitly because omitting it is
# the mistake this script exists to prevent.
step "Build app and migrate"
docker compose --env-file .env.deploy build app migrate || fail "Build failed."

step "Apply migrations"
docker compose --env-file .env.deploy run --rm migrate || fail "Migration failed. The backup above predates it."

step "Drift check after migrating"
node scripts/check-migration-drift.mjs || echo "Drift remains; see above."

step "Start app"
docker compose --env-file .env.deploy up -d app

step "Wait for health"
for attempt in $(seq 1 30); do
  STATE="$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose --env-file .env.deploy ps -q app)" 2>/dev/null || echo unknown)"
  if [[ "$STATE" == "healthy" ]]; then
    echo "app is healthy after ${attempt} checks."
    break
  fi
  [[ $attempt -eq 30 ]] && fail "app did not become healthy. Check: docker compose logs app"
  sleep 4
done

# script-src allows the one inline script (next-themes' flash-prevention snippet)
# by hash rather than 'unsafe-inline'. A stale hash does not throw — the browser
# just blocks the script and the app loads unthemed — so check it against the
# response this build actually serves.
step "CSP allows every inline script this build serves"
node scripts/check-csp-theme-hash.mjs "http://10.77.0.1:${HOUSEFLOW_PORT:-8097}/landing" \
  || fail "The CSP would block an inline script. Fix THEME_SCRIPT_HASH in next.config.js before announcing this deploy."

step "Done"
echo "Deployed. Verify the real login path against https://clankeep.com — auth cannot be"
echo "probed over plain HTTP, because the NextAuth cookies use __Host-/__Secure- prefixes"
echo "and CSRF fails before authorize() ever runs."
