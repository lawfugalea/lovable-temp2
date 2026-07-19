# ClanKeep — Database Restore Runbook

How to restore the ClanKeep production database from backup. Read the whole
scenario before typing anything: restores are destructive and all-or-nothing.

**Read this first**

- Every backup is a complete logical `pg_dump` of the `houseflow` database
  (the legacy internal name — the product is ClanKeep), gzip-compressed, with
  a `.sha256` checksum beside it.
- Copies exist in two places:
  - locally: `/home/ryan/backups/houseflow/houseflow-<STAMP>.sql.gz`
  - offsite: R2 bucket `clankeep-backups`, folder `clankeep/`
- A restore replaces **everything** as of the dump's timestamp. Data written
  after the dump is lost. One dump per day → worst-case data loss ≈ 24 h (RPO).
- Target recovery time (RTO): under 1 hour for scenario 1, a few hours for a
  full host rebuild (scenario 2).
- Backups contain **data only**. Secrets (`.env`, `.env.deploy`, `keys/`) are
  NOT in the dumps and must be kept safe separately — without them a new host
  cannot decrypt sessions, bill through Stripe, or send email.

All commands run from the repo root (`/home/ryan/lovable-temp2`) unless noted.

---

## 0. Picking and verifying a dump

List what you have:

```bash
ls -lh ~/backups/houseflow/houseflow-*.sql.gz | tail -5          # local
docker exec lovable-temp2-backup-offsite-1 \
  rclone lsf r2:clankeep-backups/clankeep | sort | tail -5        # offsite
```

If the host is alive, prefer the local copy (faster, already checksummed).
Always verify before restoring:

```bash
cd ~/backups/houseflow
sha256sum -c houseflow-<STAMP>.sql.gz.sha256
gzip -t houseflow-<STAMP>.sql.gz && echo "gzip OK"
```

To fetch a dump from R2 instead (e.g. onto a new machine), fill the
`CLANKEEP_R2_*` values from `.env.deploy`:

```bash
docker run --rm \
  -e RCLONE_CONFIG_R2_TYPE=s3 -e RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
  -e RCLONE_CONFIG_R2_ENDPOINT="<CLANKEEP_R2_ENDPOINT>" \
  -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="<CLANKEEP_R2_ACCESS_KEY_ID>" \
  -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="<CLANKEEP_R2_SECRET_ACCESS_KEY>" \
  -v "$PWD":/dl rclone/rclone:1.68 \
  copy "r2:clankeep-backups/clankeep/houseflow-<STAMP>.sql.gz" /dl
```

(Repeat for the matching `.sha256` file, then verify as above.)

---

## 1. Scenario: bad data, host still healthy

Someone deleted the wrong thing or a bad change corrupted rows. Roll the
database back to a dump.

```bash
# 1. Take a safety backup of the CURRENT (bad) state first — always.
./scripts/backup-houseflow-db.sh

# 2. Stop everything that writes to the database.
docker compose --env-file .env.deploy stop app reminder price-sync backup

# 3. Drop and recreate the database empty.
docker compose --env-file .env.deploy exec -T db \
  psql -U houseflow -d postgres -c 'DROP DATABASE houseflow;'
docker compose --env-file .env.deploy exec -T db \
  psql -U houseflow -d postgres -c 'CREATE DATABASE houseflow OWNER houseflow;'

# 4. Feed the verified dump in.
gunzip -c ~/backups/houseflow/houseflow-<STAMP>.sql.gz \
  | docker compose --env-file .env.deploy exec -T db psql -U houseflow -d houseflow

# 5. Bring the stack back (migrate is a no-op if the dump is current).
docker compose --env-file .env.deploy up -d db migrate app backup backup-offsite reminder price-sync

# 6. Verify (section 4).
```

Why drop/recreate: piping a dump over a live schema half-applies and errors
on existing objects. An empty database restores cleanly.

---

## 2. Scenario: total host loss

The server is gone. Rebuild on a fresh machine.

1. Provision a host with Docker + Docker Compose, clone the repository, and
   check out the production branch.
2. Restore the secret files from your safe location: `.env`, `.env.deploy`,
   `keys/` (these are never in git or in the dumps).
3. Fetch and verify the newest dump from R2 (section 0).
4. Start only the database, then restore:

   ```bash
   docker compose --env-file .env.deploy up -d db
   # wait for healthy:
   docker compose --env-file .env.deploy ps db
   gunzip -c houseflow-<STAMP>.sql.gz \
     | docker compose --env-file .env.deploy exec -T db psql -U houseflow -d houseflow
   ```

5. Start the full stack:

   ```bash
   docker compose --env-file .env.deploy up -d --build db migrate app backup backup-offsite reminder price-sync
   ```

6. Point DNS / the Cloudflare origin at the new host.
7. Verify (section 4). Note: user-uploaded images (`houseflow-uploads`
   volume, e.g. note images) are not in the DB dumps and are lost with the
   host unless separately backed up.

---

## 3. Scenario: restore drill (non-destructive rehearsal)

Proves the dumps are actually restorable without touching production. Run
after major schema changes or quarterly.

```bash
# 1. Scratch Postgres on a throwaway port/volume.
docker run -d --name clankeep-restore-drill \
  -e POSTGRES_DB=houseflow -e POSTGRES_USER=houseflow -e POSTGRES_PASSWORD=drill \
  -p 127.0.0.1:5599:5432 postgres:16-alpine
until docker exec clankeep-restore-drill pg_isready -U houseflow -d houseflow; do sleep 1; done

# 2. Restore the latest verified dump into it.
gunzip -c ~/backups/houseflow/houseflow-<STAMP>.sql.gz \
  | docker exec -i clankeep-restore-drill psql -U houseflow -d houseflow -q

# 3. Sanity-check schema and row counts.
docker exec clankeep-restore-drill psql -U houseflow -d houseflow -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
docker exec clankeep-restore-drill psql -U houseflow -d houseflow -tAc \
  'SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Household"), (SELECT count(*) FROM "ShoppingItem");'
# Compare against production:
docker exec lovable-temp2-db-1 psql -U houseflow -d houseflow -tAc \
  'SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Household"), (SELECT count(*) FROM "ShoppingItem");'

# 4. Clean up.
docker rm -f clankeep-restore-drill
```

Record the date and result of each drill at the bottom of this file.

---

## 4. Post-restore verification checklist

- `docker compose --env-file .env.deploy ps` — every service `Up`, app `healthy`.
- `curl -s http://10.77.0.1:8097/api/health` — `"ok":true`, reminders fresh.
- Sign in with a real account; check a shopping list, a medicine schedule and
  the money planner load with expected data.
- `docker logs lovable-temp2-migrate-1` — "All migrations have been
  successfully applied" (or "No pending migrations").
- Check Stripe subscription status still matches (Settings → billing).
- Confirm the backup services resumed:
  `docker logs lovable-temp2-backup-offsite-1 | tail -2` → `sync OK`.

## Drill log

| Date | Dump used | Result | Notes |
| ---- | --------- | ------ | ----- |
| _none yet_ | | | |
