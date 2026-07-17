# HouseFlow repository guidance

The main Codex agent is the lead engineer. It owns requirements, task division,
integration, final validation, and the final response. See [.codex/TEAM.md](.codex/TEAM.md)
for the project agent roles and parallel-work rules.

## Repository map

- `src/pages`: Next.js Pages Router pages; `src/pages/api` contains server APIs.
- `src/components`, `src/hooks`: React UI and client behavior.
- `src/lib`: authorization, household, finance, medicine, mail, and shared domain logic.
- `prisma/schema.prisma`, `prisma/migrations`: PostgreSQL schema and append-only migrations.
- `tests`: `node:test` unit and security tests.
- `scripts`: integration, backup, finance, setup, and scraper utilities.
- `public`: shipped assets. Do not scan `public/smart-images` unless relevant.
- `docs`: backup, open-banking, and security operational documentation.

This is an npm project using Next.js 16, React 18, strict TypeScript, NextAuth,
Prisma 6/PostgreSQL, Tailwind, and Docker Compose. Use Node 22 as documented in
`README.md` and `Dockerfile`; `.nvmrc` currently says 20.11.1, so flag that
known mismatch when it affects a task rather than silently changing runtimes.

## Commands

- Install: `npm ci` (`package-lock.json` is authoritative).
- Development: `npm run dev`.
- Build: `npm run build`.
- Lint: `npm run lint`.
- Type-check: `npm run typecheck`.
- Unit/security tests: `npm test`.
- One test file: `TS_NODE_PROJECT=tsconfig.test.json node --test --require ts-node/register tests/<name>.test.ts`.
- Critical integration workflow: `npm run test:integration`. It creates fixed
  users/data and must target an isolated app/database via `HOUSEFLOW_TEST_BASE_URL`.
- Prisma validation/generation: `npx prisma validate` and `npm run prisma:generate`.
- Prisma formatting only: `npx prisma format`. No repository-wide formatter or
  formatting script is configured; follow the style of the file being edited.
- Deploy migrations: `npm run prisma:migrate:deploy` after a verified backup.
- Local database: `docker compose --env-file .env.deploy up -d db`.
- Validate Compose: `docker compose --env-file .env.deploy config --quiet`.
- Backup: `./scripts/backup-houseflow-db.sh`.
- Production stack: `docker compose --env-file .env.deploy up -d --build db migrate app backup`.

Do not guess unlisted commands. Mark uncertain commands unverified and inspect
`package.json`, `README.md`, or the relevant tool help first.

## Implementation conventions

- Prefer TypeScript and the `@/` alias. Preserve local quote/semicolon style;
  no formatter currently standardizes it.
- Keep Pages Router APIs as default-exported handlers with explicit method,
  authentication, input-validation, and authorization checks.
- Household data access must validate both the authenticated session and current
  household membership. Reuse `src/lib/api-guards.ts` and related helpers.
- Preserve the configured base path; use `src/lib/base-path.ts` for URLs that a
  browser loads directly.
- Use `node:test` with `node:assert/strict` for unit tests.
- Treat applied Prisma migrations as immutable. Add a new migration, validate it
  on disposable PostgreSQL, and back up before any production migration.
- Preserve unrelated work in the dirty worktree. Never revert, overwrite, or
  reformat user changes outside the task.

## Delegation policy

- Small, local, routine changes belong to the lead agent. Do not spawn agents
  merely because they are available; use the minimum number required.
- Prefer subagents for substantial read-heavy investigation, testing, review,
  or genuinely independent implementation. Do not automatically run Explorer,
  Worker, and Reviewer for every request.
- A normal feature should use at most one Explorer and one Worker unless there
  is a concrete reason for more. Add a Reviewer only for substantial, risky,
  security-sensitive, migration, or release work—not trivial text/format changes.
- Avoid duplicated investigation. Give every delegation a precise question,
  writable ownership boundary, dependencies, and expected concise output.
- There must be one clear owner for each writable area. Never run Workers on
  overlapping files/directories concurrently. Shared files such as
  `package.json`, `package-lock.json`, Prisma schema/migrations, central auth
  helpers, and deployment files should normally have one sequential owner.
- Wait for required delegated results before integration. Review subagent output
  and diffs rather than accepting them blindly.
- Run only validation relevant to changed files. Do not run the full suite for
  a trivial isolated change unless required. Never claim checks passed unless
  they actually completed successfully.
- Preserve existing behavior unless the request explicitly changes it. Never
  print, expose, modify, or commit real secrets.

## Parallel work and independent tasks

Subagents are children of one larger task: they may handle independent pieces in
parallel, but their summaries return to the lead agent for integration. Separate
unrelated jobs belong in separate Codex desktop app tasks/threads, preferably
isolated Git branches/worktrees. Do not imply that a busy interactive CLI turn
can accept unrelated new instructions while it is still executing.

For app worktrees, define each task's scope and branch/worktree, avoid overlapping
writable files, and do not let multiple tasks modify the main branch directly.
Review changes before merging; integrate and run full relevant validation only
after the separate work is combined.

## Sensitive and operational boundaries

Never read, reproduce, edit, or commit real values from `.env`, `.env.deploy`,
`keys/`, database volumes, upload volumes, or `/home/ryan/backups/houseflow`.
Templates `.env.example` and `.env.deploy.example` must contain placeholders only.
Avoid `.next`, `node_modules`, `smart_debug` archives, generated master documents,
and large asset trees unless directly relevant. Deployment, backup/restore,
finance enrichment, scrapers, and clear/delete scripts can mutate persistent or
external state; run them only when the user explicitly places that operation in scope.

## Completion

A change is complete when its requested behavior is implemented within scope,
relevant tests/checks have actually passed (or failures are reported), the focused
diff has been reviewed, migrations and docs are updated when behavior requires
them, no secrets or unrelated changes were introduced, and remaining risks or
unverified assumptions are stated clearly.
