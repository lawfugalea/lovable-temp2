# HouseFlow backups

HouseFlow data lives in the Docker Postgres volume `houseflow-postgres-data`.

## Manual backup

```bash
cd /home/ryan/lovable-temp2
./scripts/backup-houseflow-db.sh
```

Default output directory:

```text
/home/ryan/backups/houseflow
```

Each backup writes:

- `houseflow-YYYYMMDDTHHMMSSZ.sql.gz`
- matching `.sha256` checksum

## Offsite copies (Cloudflare R2)

The `backup-offsite` compose service pushes every dump to a Cloudflare R2
bucket with `rclone copy` every 6 hours, and prunes remote files older than
`HOUSEFLOW_BACKUP_KEEP_DAYS`. Nightly dumps are ~17 MB compressed, so a
30-day window uses well under 1 GB of R2's 10 GB free tier.

Setup (once):

1. Cloudflare dashboard → R2 → create bucket (e.g. `clankeep-backups`).
2. R2 → Manage API Tokens → create a token with **Object Read & Write**
   scoped to that bucket only.
3. Fill `CLANKEEP_R2_ENDPOINT`, `CLANKEEP_R2_ACCESS_KEY_ID`,
   `CLANKEEP_R2_SECRET_ACCESS_KEY`, `CLANKEEP_R2_BUCKET` in `.env.deploy`.
4. `docker compose --env-file .env.deploy up -d backup-offsite`, then check
   `docker logs lovable-temp2-backup-offsite-1` for `offsite backup sync OK`.

Until the variables are set the service stays up but only logs a warning.

Fetch a remote dump for restore:

```bash
docker run --rm \
  -e RCLONE_CONFIG_R2_TYPE=s3 -e RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
  -e RCLONE_CONFIG_R2_ENDPOINT="$CLANKEEP_R2_ENDPOINT" \
  -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="$CLANKEEP_R2_ACCESS_KEY_ID" \
  -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$CLANKEEP_R2_SECRET_ACCESS_KEY" \
  -v "$PWD":/dl rclone/rclone:1.68 \
  copy "r2:$CLANKEEP_R2_BUCKET/clankeep/houseflow-<STAMP>.sql.gz" /dl
```

## Suggested cron

```cron
17 3 * * * cd /home/ryan/lovable-temp2 && ./scripts/backup-houseflow-db.sh >> /home/ryan/backups/houseflow/backup.log 2>&1
```

## Restoring

Follow [CLANKEEP_RESTORE_RUNBOOK.md](CLANKEEP_RESTORE_RUNBOOK.md) — it covers
verifying a dump, rolling back bad data, rebuilding after total host loss,
and a non-destructive restore drill. Do not improvise destructive restores.
