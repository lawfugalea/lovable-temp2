# Clankeep

Clankeep is a self-hosted household app built with Next.js, TypeScript, PostgreSQL, Prisma, NextAuth, and Tailwind CSS. It includes shared shopping lists, meal planning, chores, a household money planner, medicine and fever tracking, notes, household invitations, and an administrator panel.

## Requirements

- Node.js 22 LTS
- npm
- Docker with Docker Compose (recommended for PostgreSQL and production)

## Local development

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy the documented environment template:

   ```bash
   cp .env.example .env
   ```

3. Create the deployment settings file, set a strong PostgreSQL password, then use the same password in the three database URLs in `.env`:

   ```bash
   cp .env.deploy.example .env.deploy
   ```

   The Compose database is exposed only on `127.0.0.1:5434` for local development.

4. Start PostgreSQL and apply migrations:

   ```bash
   docker compose --env-file .env.deploy up -d db
   npm run prisma:migrate:deploy
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

The development server is available at `http://localhost:3000`.

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Production deployment

The production stack contains the application, PostgreSQL, a one-shot migration service, daily backup, a parked supermarket-price worker, and a medicine-reminder worker:

```bash
docker compose --env-file .env.deploy up -d --build db migrate app backup backup-offsite reminder price-sync
```

Before deploying a new migration, take and verify a backup:

```bash
./scripts/backup-houseflow-db.sh
```

Deployment variables belong in the ignored `.env.deploy` file. Application secrets belong in the ignored `.env` file. Never add either file to the Docker build context or Git.

Invitation email requires `RESEND_API_KEY` in `.env` and a verified sender in
`INVITES_FROM`. Set `INVITES_FROM_DOMAIN` to the same verified domain (normally
configured in `.env.deploy`). Link-only invitations remain available when
email delivery is not configured.

See [docs/HOUSEFLOW_BACKUPS.md](docs/HOUSEFLOW_BACKUPS.md) for backup procedures
and [docs/CLANKEEP_RESTORE_RUNBOOK.md](docs/CLANKEEP_RESTORE_RUNBOOK.md) for the restore runbook.

For the child health journal and private Web Push setup, see
[docs/HOUSEFLOW_HEALTH_JOURNAL.md](docs/HOUSEFLOW_HEALTH_JOURNAL.md).

For the personal Bank of Valletta connection, see
[docs/HOUSEFLOW_OPEN_BANKING.md](docs/HOUSEFLOW_OPEN_BANKING.md).

For supermarket sources, matching rules, freshness, and sync operations, see
[docs/SUPERMARKET_PRICE_COMPARISON.md](docs/SUPERMARKET_PRICE_COMPARISON.md).

## Important directories

- `src/pages` — application pages and API routes
- `src/components` — reusable UI components
- `src/lib` — authorization, database, mail, and domain helpers
- `prisma/schema.prisma` — current database model
- `prisma/migrations` — deployable database history
- `scripts` — backup, setup, and scraper utilities

## Authentication and authorization

Clankeep currently uses email/password credentials through NextAuth. Household data must be accessed through APIs that validate both the session and household membership. Administrator access is configured with the comma-separated `ADMIN_EMAILS` environment variable.
