#!/usr/bin/env bash
#
# Exercise a candidate build on a throwaway stack before it reaches production.
#
# Production is live at https://clankeep.com with no staging copy, and this repo
# has already lost a database once (see the warning at the top of
# scripts/deploy-production.sh, 2026-07-18). The failure mode this script is
# built around is not a subtle one: docker-compose.yml gives both volumes an
# explicit `name:`, which defeats Compose's project-name prefixing, so a
# verification stack started with `-p` alone attaches to the *live production
# database volume*.
#
# So the preflight below does not read the YAML. It asks Compose what it
# actually resolved, and refuses to start unless the resolved configuration is
# provably not production.
#
#   scripts/verify-stack.sh              # full run, tears down afterwards
#   scripts/verify-stack.sh --keep       # leave the stack up for poking at
#   scripts/verify-stack.sh --down       # tear down a stack left by --keep
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="clankeep-verify"
BASE_URL="http://127.0.0.1:3100"
COMPOSE=(docker compose -p "$PROJECT" -f docker-compose.yml -f docker-compose.verify.yml --env-file .env.verify)

KEEP=0
case "${1:-}" in
  --keep) KEEP=1 ;;
  --down) ;;
  "") ;;
  *) echo "Unknown argument: $1" >&2; exit 2 ;;
esac

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
pass() { printf '\033[32m    ok\033[0m %s\n' "$1"; }
fail() { printf '\n\033[31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

teardown() {
  step "Tearing down $PROJECT"
  "${COMPOSE[@]}" down -v --remove-orphans || true
}

if [[ "${1:-}" == "--down" ]]; then
  teardown
  exit 0
fi

[[ -f .env.verify ]] || fail ".env.verify is missing. Copy it: cp .env.verify.example .env.verify"

# ---------------------------------------------------------------------------
# Preflight. Every assertion runs against `compose config`, i.e. the merged and
# interpolated result, so a mistake in the overlay cannot slip past by looking
# right in the source file.
# ---------------------------------------------------------------------------
step "Preflight: this stack is not production"

RESOLVED="$("${COMPOSE[@]}" config)" || fail "compose config failed; the overlay does not merge cleanly."

# 1. Volume names. The single most important check in this file.
RESOLVED_VOLUMES="$(printf '%s' "$RESOLVED" | awk '/^volumes:/,0' | grep -E '^\s+name:' | awk '{print $2}' || true)"
[[ -n "$RESOLVED_VOLUMES" ]] || fail "Could not read resolved volume names; refusing to guess."
while read -r volume; do
  [[ -z "$volume" ]] && continue
  case "$volume" in
    *verify*) pass "volume $volume" ;;
    *) fail "Resolved volume '$volume' is not a verification volume. This stack would attach to production data." ;;
  esac
done <<< "$RESOLVED_VOLUMES"

# 2. No production secret reaches this stack.
#
#    Checking for a literal `.env` reference here would prove nothing: Compose
#    folds env_file into `environment` before `config` prints it, so the string
#    `.env` never appears in the output whether the override worked or not. The
#    check has to look for the *values* instead.
#
#    This matters because Compose merges sequences by appending rather than
#    replacing. Without the !override tags in docker-compose.verify.yml, this
#    stack would load production .env alongside .env.verify and receive the live
#    Stripe secret key, the Enable Banking private key and the DeepSeek key.
#
#    Only key names are ever printed. Nothing here echoes a value.
PROD_ONLY_SECRETS=(
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
  ENABLE_BANKING_PRIVATE_KEY_BASE64
  DEEPSEEK_API_KEY
  META_CONVERSIONS_TOKEN
  VAPID_PRIVATE_KEY
  CLANKEEP_R2_SECRET_ACCESS_KEY
)
for key in "${PROD_ONLY_SECRETS[@]}"; do
  # Non-empty means something other than .env.verify supplied it. An empty
  # string or `""` is the expected unconfigured state.
  if printf '%s' "$RESOLVED" | grep -qE "^\s+$key: *(\"\")?\s*$"; then
    continue
  fi
  if printf '%s' "$RESOLVED" | grep -qE "^\s+$key:"; then
    fail "Resolved config carries a non-empty $key. A production secret is reaching the verification stack; check the !override tags in docker-compose.verify.yml."
  fi
done
pass "no production secret in the resolved config"

# Positive confirmation that .env.verify is the file actually in effect, rather
# than merely last in a merged list.
if ! printf '%s' "$RESOLVED" | grep -qE '^\s+NEXTAUTH_SECRET: verify-only'; then
  fail "NEXTAUTH_SECRET did not come from .env.verify. Refusing to run against an unknown identity configuration."
fi
pass ".env.verify is the effective environment"

# 3. Ports must not collide with the live stack (app 10.77.0.1:8097, db 5434).
if printf '%s' "$RESOLVED" | grep -q '5434'; then
  fail "Resolved config publishes 5434, the production database port."
fi
if printf '%s' "$RESOLVED" | grep -q '8097'; then
  fail "Resolved config publishes 8097, the production app port."
fi
pass "ports 3100/5435 only"

# 4. The database must be the compose-internal one, never a host or remote URL.
RESOLVED_DB_URLS="$(printf '%s' "$RESOLVED" | grep -oE 'postgresql://[^"[:space:]]+' | sort -u || true)"
[[ -n "$RESOLVED_DB_URLS" ]] || fail "Could not read resolved DATABASE_URL; refusing to guess."
while read -r url; do
  [[ -z "$url" ]] && continue
  [[ "$url" == *"@db:5432/"* ]] || fail "Resolved database URL '$url' does not point at the compose-internal db service."
done <<< "$RESOLVED_DB_URLS"
pass "database URLs point at the internal db service"

# ---------------------------------------------------------------------------
# Build and start. Both app and migrate are built: migrate builds from
# `target: builder` and is NOT rebuilt by `build app`, and Batch 1's sharp
# override is a native module that must be proven inside the musl image rather
# than in host node_modules.
# ---------------------------------------------------------------------------
step "Building app and migrate"
"${COMPOSE[@]}" build app migrate || fail "Build failed."

step "Migrating an empty database"
"${COMPOSE[@]}" run --rm migrate || fail "Migration failed against a fresh database."

step "Starting the app"
"${COMPOSE[@]}" up -d app || fail "App did not start."

step "Waiting for the healthcheck"
for attempt in $(seq 1 40); do
  STATE="$(docker inspect --format '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q app)" 2>/dev/null || echo unknown)"
  [[ "$STATE" == "healthy" ]] && break
  if [[ $attempt -eq 40 ]]; then
    "${COMPOSE[@]}" logs --tail 60 app || true
    fail "App never became healthy (last state: $STATE)."
  fi
  sleep 3
done
pass "app healthy"

# ---------------------------------------------------------------------------
# The actual verification.
# ---------------------------------------------------------------------------
step "Integration workflows"
HOUSEFLOW_TEST_BASE_URL="$BASE_URL" npm run test:integration || {
  "${COMPOSE[@]}" logs --tail 60 app || true
  [[ $KEEP -eq 1 ]] || teardown
  fail "Integration workflows failed."
}
pass "critical workflows"

# The five container/security assertions from the 2026-07-16 review. A patched
# framework is the most likely thing to quietly drop a security header, so these
# are checked on the running image rather than assumed from next.config.js.
step "Security posture"

APP_CID="$("${COMPOSE[@]}" ps -q app)"

curl -fsS -o /dev/null -D /tmp/verify-headers.txt "$BASE_URL/login" || fail "Could not fetch /login."
grep -qi '^content-security-policy:' /tmp/verify-headers.txt || fail "Content-Security-Policy header is missing."
pass "CSP present"

grep -qi '^strict-transport-security:' /tmp/verify-headers.txt || fail "Strict-Transport-Security header is missing."
pass "HSTS present"

DEBUG_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/debug/session")"
[[ "$DEBUG_STATUS" == "401" ]] || fail "/api/debug/session returned $DEBUG_STATUS, expected 401."
pass "debug endpoint refuses unauthenticated callers"

if docker exec "$APP_CID" sh -c 'touch /app/should-not-be-writable' 2>/dev/null; then
  fail "Root filesystem accepted a write; read_only is not in effect."
fi
pass "root filesystem is read-only"

docker exec "$APP_CID" sh -c 'touch /tmp/writable && rm /tmp/writable' \
  || fail "/tmp is not writable; the app needs it."
pass "/tmp is writable"

CAPS="$(docker inspect --format '{{.HostConfig.CapDrop}}' "$APP_CID")"
[[ "$CAPS" == *ALL* ]] || fail "Capabilities are not dropped (CapDrop: $CAPS)."
pass "all capabilities dropped"

# sharp is the reason this script builds the image at all: 0.34 -> 0.35 is a
# major bump of a native module, and the runner is linux/musl. Proving the
# binding loads in the built image is the only check that means anything.
step "Native image pipeline"
SHARP_VERSION="$(docker exec "$APP_CID" node -e "process.stdout.write(require('sharp').versions.sharp)" 2>/dev/null || true)"
[[ -n "$SHARP_VERSION" ]] || fail "sharp failed to load inside the runner image."
pass "sharp $SHARP_VERSION loads in the musl runner"

if [[ $KEEP -eq 1 ]]; then
  step "Stack left running at $BASE_URL"
  echo "Tear down with: scripts/verify-stack.sh --down"
else
  teardown
fi

printf '\n\033[32mVerification passed.\033[0m\n'
