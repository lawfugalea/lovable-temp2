# Clankeep repository guidance

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

## Mobile continuation

Before any iOS or Android work, read the durable handoff at
`/home/ryan/lovable-temp2-mobile/.codex/MOBILE_HANDOFF.md` and continue in that
isolated worktree on branch `mobile/foundation`. Keep the handoff current at the
end of every mobile session. Do not implement mobile changes in this worktree.
