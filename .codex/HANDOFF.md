# HouseFlow supermarket expansion handoff

Updated: 2026-07-17 17:09 Europe/Malta

## User goal

Deploy HouseFlow, publish all changes to GitHub, expand Malta supermarket
catalogue coverage, and include retailer product images where permission and
source data allow. The user correctly challenged an earlier `483` figure: that
was only valid barcodes in a capped 500-row Greens diagnostic sample.

## Git and GitHub

- Branch: `agent/houseflow-production-release`
- Remote: `origin`
- Latest pushed commit: `90aac79 Handle Greens catalogue pagination accurately`
- Earlier expansion commit: `9b1fe27 Expand supermarket catalogue coverage`
- Draft PR: https://github.com/lawfugalea/lovable-temp2/pull/1
- Worktree was clean immediately after `90aac79`; this handoff file is the only
  expected new uncommitted file.

## Implemented and pushed

- Fixed Chromium in the read-only `price-sync` container by putting HOME/XDG
  state under writable `/tmp/priceworker`.
- Added diagnostic page caps for Greens and Happy Shopper.
- Added an opt-in Happy Shopper (`hs.mt`) Odoo catalogue adapter with product
  names, prices, source links, and images. It intentionally uses conservative
  store-only matching because the public catalogue does not expose barcodes.
- Added Happy Shopper to retailer source URL validation.
- Improved PAVI/PAMA image-field fallback.
- Added a hard PAVI/PAMA permission gate. It only runs when both its slug is
  selected and `PAVIPAMA_PERMISSION_CONFIRMED=true`.
- Added a Greens image-rights gate. Greens image URLs are omitted unless
  `GREENS_IMAGE_USE_CONFIRMED=true`.
- Fixed Greens pagination to stop on the real short final page instead of its
  inaccurate `TOTAL_RECORDS` value.
- Updated env templates, Compose, documentation, and regression tests.

## Live catalogue findings

- Greens Swieqi (`SM`) currently returns 30,980 rows: pages 1-123 contain 250
  rows and page 124 contains 230. Its API incorrectly advertises 252,374 total.
- A two-page Greens diagnostic returned 500 products, 483 valid GTINs, and 500
  technically available image URLs. Image reuse is gated because Greens terms
  require written approval for reuse of site images.
- Smart previously completed a full 9,049-product run. The Chromium crash is
  fixed and the rebuilt worker successfully paged through the live site.
- Welbee's latest completed run before this handoff had 137 products.
- PAVI/PAMA diagnostic: 40 products, 40 barcodes, 38 source images. Its current
  terms explicitly prohibit automated extraction and price-comparison reuse
  without written consent, so it must stay disabled absent permission.
- Happy Shopper diagnostic: 48 products across two capped pages, all 48 with
  images, no barcodes. Keep recurring production use opt-in pending permission.

Official terms checked:

- Greens: https://www.greens.com.mt/termsconditions?loc=SM
- PAVI/PAMA: https://www.pavipama.com.mt/app/termsandconditions

## Production state at handoff

- Main HouseFlow stack was deployed successfully earlier; app/db were healthy,
  `/houseflow/api/health` returned HTTP 200, and all 21 migrations were applied.
- A verified database backup was taken before deployment and another before the
  expanded price-sync deployment. Do not inspect or expose backup/env secrets.
- Current `price-sync` container uses the rebuilt image and was recreated with:
  `HOUSEFLOW_CATALOG_SYNC_STORES=welbees,greens`.
- At 2026-07-17 17:09 Europe/Malta, Greens run started at DB timestamp
  `2026-07-17 15:07:44.479` UTC and was still `RUNNING` while fetching/ingesting
  the uncapped 30,980-row catalogue. Welbee's will run after Greens because
  adapter order is Smart, Greens, Welbee's, PAVI/PAMA, Happy Shopper.
- Several Smart runs show stale `RUNNING` status because supervised container
  restarts interrupted them at `14:50:59`, `14:57:29`, and `15:00:53` UTC.
  After the active Greens/Welbee's run finishes, mark only those three old runs
  failed with a clear "interrupted during deployment restart" error and finish
  timestamp. Do not touch the active run.
- The current Greens enablement is a container recreation override, not a
  modification to secret `.env.deploy`. On a future ordinary Compose recreate,
  it may revert to whatever `HOUSEFLOW_CATALOG_SYNC_STORES` is already set to.
  Never read or edit `.env.deploy`; ask the operator to persist `greens` there if
  desired.

## Resume checks

1. Check the latest runs:

   ```bash
   docker compose --env-file .env.deploy exec -T db psql -U houseflow -d houseflow -P pager=off -c 'SELECT s.slug, r.status, r."productsSeen", r."offersChanged", r."startedAt", r."finishedAt" FROM "PriceSyncRun" r JOIN "Store" s ON s.id = r."storeId" ORDER BY r."startedAt" DESC LIMIT 10;'
   ```

2. Check worker milestones/errors:

   ```bash
   docker compose --env-file .env.deploy logs --no-color price-sync | rg 'products observed|sync failed|catalogue safety' | tail -30
   ```

3. Once Greens and Welbee's succeed, query active catalogue/image coverage by
   store. Expect Greens images to be zero unless written image permission was
   explicitly confirmed; do not fabricate replacement images.
4. Clean only the three interrupted Smart run records described above.
5. Confirm app health and `git status --short`.
6. Decide whether to commit this handoff file. All implementation changes are
   already pushed; if committed, push it to the existing branch/PR.

## Validation completed

- `npm test`: 65/65 passed after the final pagination fix.
- Scoped ESLint passed for all changed source/test files.
- `npm run typecheck` passed earlier in this change set.
- Full production build passed repeatedly in the Node 22 Docker builder.
- `docker compose --env-file .env.deploy config --quiet` passed.
- `git diff --check` passed.
- Host Node is 24; repository docs/Docker use Node 22. `.nvmrc` remains the known
  stale Node 20.11.1 mismatch and was intentionally not changed.
