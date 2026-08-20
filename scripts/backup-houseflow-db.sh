#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${HOUSEFLOW_BACKUP_DIR:-/home/ryan/backups/houseflow}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/houseflow-$STAMP.sql.gz"
TMP="$OUT.tmp"
KEEP_DAYS="${HOUSEFLOW_BACKUP_KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
cd "$ROOT"

trap 'rm -f "$TMP"' EXIT INT TERM
docker compose --env-file .env.deploy exec -T db pg_dump -U houseflow -d houseflow | gzip -9 > "$TMP"
gzip -t "$TMP"
mv "$TMP" "$OUT"
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256"
)
trap - EXIT INT TERM
find "$BACKUP_DIR" -type f \( -name 'houseflow-*.sql.gz' -o -name 'houseflow-*.sql.gz.sha256' \) -mtime +"$KEEP_DAYS" -delete

echo "$OUT"
