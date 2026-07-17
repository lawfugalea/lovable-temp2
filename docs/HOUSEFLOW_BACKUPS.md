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

## Suggested cron

```cron
17 3 * * * cd /home/ryan/lovable-temp2 && ./scripts/backup-houseflow-db.sh >> /home/ryan/backups/houseflow/backup.log 2>&1
```

## Restore sketch

Stop the app first if doing a destructive restore.

```bash
gunzip -c /home/ryan/backups/houseflow/houseflow-YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose --env-file .env.deploy exec -T db psql -U houseflow -d houseflow
```

For a full clean restore, recreate the DB/volume deliberately first. Do not run destructive restore commands without checking the target.
