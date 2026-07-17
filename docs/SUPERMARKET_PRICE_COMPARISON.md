# Malta supermarket price comparison

HouseFlow compares public online catalogue prices from Smart, Greens, Welbee's,
and PAVI/PAMA. Results are estimates for planning a shop; delivery charges,
loyalty-only discounts, physical-branch differences, and travel costs are not
included. The Greens adapter uses the public Swieqi (`SM`) online catalogue
location so its prices may differ from Mriehel or Gozo.

## Catalogue synchronization

Run the default Smart and Welbee's adapters once:

```bash
npm run prices:sync
```

Smart and Welbee's are enabled by default. Use
`CATALOG_SYNC_STORES=smart,welbees,greens,pavipama` to opt into the remaining
adapters after their terms, access, and data quality have been checked. The
production Compose stack includes `price-sync`, which runs immediately and then
every 24 hours. Override the interval with
`HOUSEFLOW_PRICE_SYNC_INTERVAL_SECONDS`.

`PAVIPAMA_MAX_PAGES` can cap that large catalogue during diagnostics. A capped
run does not mark unseen products unavailable. Production should leave the value
at `0` for a complete import. `CATALOG_REQUEST_DELAY_MS` controls the minimum
pause between public catalogue requests. Smart diagnostic runs using `CAT` or
`MAX_PAGES` are also treated as partial and never mark unseen products unavailable.

The adapters only read public catalogue pages/endpoints and never log in, bypass
access controls, or submit carts. Before enabling an adapter in a public or
commercial deployment, the operator must confirm the retailer's current terms
permit the intended use. Disable a source immediately by removing its slug from
`HOUSEFLOW_CATALOG_SYNC_STORES` if permission or data quality is uncertain.

## Freshness and failures

- Prices observed in the last 48 hours can be used in basket totals.
- Prices from 48 hours to seven days old are visible with a stale warning but are
  excluded from totals.
- Older observations are hidden.
- A product is marked unavailable only after two complete successful imports do
  not contain it.
- A complete import that unexpectedly returns less than 60% of the previously
  active catalogue is rejected before availability changes are applied.
- Each store records its last attempt, last successful import, failure count,
  and recent sync runs in PostgreSQL.

Check recent runs with Prisma Studio or a read-only SQL query against
`PriceSyncRun`. Repeated failures normally mean a retailer changed its catalogue
shape; disable that adapter until its parser or API mapping is updated.

## Matching rules

GTIN/barcode equality is the strongest cross-store match. Products without a
barcode are grouped only when normalized brand, description, and pack size match
exactly. Ambiguous products remain separate and require the user to confirm the
shopping-list item. Different brands or package sizes are never silently used in
an exact-product basket total.

## Deployment

Back up PostgreSQL before deploying the catalogue migration, then run:

```bash
npm run prisma:migrate:deploy
docker compose --env-file .env.deploy up -d --build app price-sync
```

The price worker uses Node 22 and a containerized Chromium browser for Smart's
legacy catalogue. The repository's `.nvmrc` still names Node 20.11.1; use Node 22
for this workflow, matching the README and Dockerfile.
