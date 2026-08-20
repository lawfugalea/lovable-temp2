# Clankeep mobile handoff

Last updated: 2026-08-08

This file is the durable continuation point for Codex sessions working on the
Clankeep iOS and Android application. Update it whenever mobile work changes
state. Do not store secrets, tokens, signing keys, database URLs, or personal
developer-account information here.

## Non-negotiable safety rules

- The existing Next.js web application must remain functional and supported.
- Mobile work happens in `/home/ryan/lovable-temp2-mobile` on branch
  `mobile/foundation`, created from commit `ac9ab36`.
- The original worktree is `/home/ryan/lovable-temp2` on branch
  `agent/houseflow-production-release`. At isolation time it contained user-owned
  changes to `.gitignore`, `AGENTS.md.save`, and `marketing/`. Do not modify,
  stash, commit, or copy those changes into mobile work without explicit review.
- The user authorized mobile testing against the current database, which contains
  only their data. Do not seed, reset, destructively migrate, or deploy unrelated
  database changes.
- Do not submit store builds or change Apple/Google, Stripe, banking, DNS, or
  signing configuration without explicit user confirmation.
- Every backend or schema change must be backward-compatible and must pass the
  existing web tests, lint, strict TypeScript, and production build.
- Medicine writes remain online/server-authoritative. Do not introduce offline
  dose recording.

## Product decisions already made

- One Expo/React Native application for iOS and Android; web remains a full client.
- Staged delivery with complete feature parity as the long-term goal.
- Support phones and tablets, targeting iOS 16.4+ and Android 10+.
- Safe shopping, chore, and meal actions will eventually support an offline queue.
- Finance, billing, membership, administration, collaborative note editing, and
  health mutations remain online-only initially.
- Use RevenueCat for future Apple/Google subscriptions while retaining Stripe for web.
- Preserve TipTap note compatibility with a restricted embedded editor WebView.
- The user currently has an iPhone and wants guided, beginner-friendly steps.
- The user's personal computer is Windows, but this repository and Docker stack
  run on the Linux VPS `vps-lawfu`; use secure tunnels/HTTPS for phone testing.
- The current database contains only the user's real household data. On
  2026-07-20 the user explicitly authorized mobile testing against it.
- The provisional `More` information architecture was replaced in the Navigation
  & Visual Design phase. Notes is now a first-class destination; Family & Account
  is reached from Home rather than occupying a primary tab.

## Foundation milestone completed

The changes are implemented but intentionally uncommitted for review.

- Added the isolated Expo app under `apps/mobile`. It was initially built on SDK
  57, then moved to SDK 54 so the user's physical iPhone can use free Expo Go
  during Expo's SDK 57 transition.
- Added native login UI, SecureStore token persistence, rotating refresh tokens,
  automatic access-token renewal, logout, and session invalidation.
- Added household switching and an adaptive read-only dashboard for phone/tablet.
- Added shared mobile API contracts under `packages/contracts`.
- Added versioned endpoints under `/api/mobile/v1` for login, refresh, logout,
  bootstrap, active-household selection, and dashboard data.
- Added the append-only `MobileSession` Prisma migration at
  `prisma/migrations/20260720210000_mobile_sessions`.
- Browser NextAuth, existing web pages, Stripe web billing, and existing APIs were
  not replaced.

## Shopping milestone completed

The changes are implemented but intentionally uncommitted for review.

- Added a native Shopping tab that loads active lists and their current items.
- Added list creation and item creation with an optional unit/note.
- Added complete/reopen, quantity increment/decrement, pull-to-refresh, and
  confirmation-protected item deletion.
- Added minimal mobile shopping DTOs; mobile responses do not expose item creator
  or completer email addresses.
- Added household-authorized versioned routes under `/api/mobile/v1/shopping`.
  Existing `/api/shopping` web routes were not changed.
- No shopping or other database schema migration was required.
- Added pure input validation/security tests and a reversible API smoke script.

## Chores milestone completed

- Added a native Chores tab for today's scheduled and recent overdue occurrences.
- Shows schedule, notes, assignee, completion attribution, and overdue state.
- Added complete and reopen actions plus pull-to-refresh. Chore creation, recurrence
  editing, skipping, and deletion remain on the web for now.
- Added minimal household-authorized `/api/mobile/v1/chores/today` and
  `/api/mobile/v1/chores/complete` routes. They reuse the existing recurrence engine
  and refuse completion for dates on which the chore is not scheduled.
- Added focused date/authorization tests and a reversible API smoke script.
- The smoke test created only a clearly named temporary scheduled chore and mobile
  session, verified pending -> done -> reopened, then removed both. Cleanup was
  verified at zero temporary chores and zero temporary sessions.
- Final validation on 2026-07-21: 124/124 root tests, root/mobile strict TypeScript,
  mobile lint, Expo Doctor 18/18, zero-vulnerability mobile production audit, and
  iOS/Android exports passed. Root lint retained only the three pre-existing TipTap
  warnings. The web production build compiled and generated all pages successfully;
  its runner again lingered after final output and was stopped.

## Meals milestone completed

- Added a native Meals tab with the current seven-day dinner plan, previous/next
  week navigation, today highlighting, and pull-to-refresh.
- A day can select an existing household recipe, save a free-text dinner, replace
  either form, or clear the plan. Recipe creation/editing remains on the web.
- Added selection of an active shopping list and confirmation-protected generation
  of the week's linked-recipe ingredients. Existing active items are merged using
  the same web meal-planning logic.
- Added minimal household-authorized `/api/mobile/v1/meals/week` and
  `/api/mobile/v1/meals/generate-shopping` routes. Existing web meal APIs were not
  changed, and no schema migration was required.
- A reversible API smoke test used an unoccupied reserved 2099 date plus a dedicated
  temporary recipe, ingredient, list, and session. Recipe planning, week loading,
  ingredient generation, free-text replacement, and clearing passed. Cleanup was
  verified at zero temporary recipes, lists, sessions, and reserved-date entries.
- Final validation on 2026-07-21: 126/126 root tests, root/mobile strict TypeScript,
  mobile lint, Expo Doctor 18/18, zero-vulnerability mobile production audit, and
  iOS/Android exports passed. Root lint retained only the three pre-existing TipTap
  warnings. The web production build compiled and generated all pages successfully;
  its runner again lingered after final output and was stopped.

## Medicine milestone (implemented, local validation complete)

- Added a sixth native `Meds` tab with a deliberately read-only overview of every
  child, active medicines, schedule status, PRN eligibility/daily limits, next or
  last dose, recent dose history, and recent fever readings. Children without an
  active course remain visible with a clear empty state. The screen includes
  explicit clinician/label and unverified schedule warnings and contains no health
  action controls.
- Added minimal household-authorized GET-only
  `/api/mobile/v1/medicine/overview`. It reuses the existing web schedule logic and
  omits date of birth, notes, warning reasons, dose-account identifiers, and other
  unnecessary health data. Existing web medicine routes were not changed, and no
  schema migration was required.
- The API smoke test used only a temporary mobile session in the user-authorized
  current database. GET returned 200, POST returned 405, and before/after medicine,
  dose, and fever-reading counts were identical. Cleanup was verified at zero
  temporary sessions.
- Final validation on 2026-07-21: 128/128 root tests, root/mobile strict TypeScript,
  mobile lint, Expo Doctor 18/18, zero-vulnerability mobile production audit, and
  iOS/Android exports passed. Root lint retained only the three pre-existing TipTap
  warnings. The web production build compiled, generated all pages, and reached
  final optimization; its runner again lingered after final output and was stopped.

## Health overview milestone (implemented, local validation complete)

- Renamed the sixth native tab from `Meds` to `Health` and preserved the existing
  child, medicine, dose, and fever views.
- Added read-only current/recent illness episodes with child, time range,
  inferred status, and dose/temperature counts, plus recent weight measurements.
  Episode notes and creator identities, weight notes and recorder identities, and
  all health write controls remain excluded.
- Extended the same household-authorized GET-only mobile overview; existing web
  APIs and the database schema were not changed.
- The live-database smoke test verified GET 200, POST 405, and identical before/
  after counts for medicines, doses, fever readings, health episodes, and weights.
  Its temporary mobile session was removed.
- Local validation on 2026-07-21: 128/128 tests, root/mobile TypeScript, mobile
  lint, Expo Doctor 18/18, zero mobile production vulnerabilities, and iOS/Android
  exports passed. Root lint retained only the three pre-existing TipTap warnings.
  The web build compiled, generated all pages, and reached final trace collection
  before its known lingering runner was stopped.

## Daily Life parity phase (implemented, local validation complete)

- This is the first larger combined phase, covering Shopping, Chores, and Meals
  behind one final device checkpoint.
- Shopping now supports list rename/delete and item title/unit editing in addition
  to existing list/item creation, quantities, completion, reopen, and deletion.
- Chores now loads the complete recurring-chore catalogue and supports create,
  edit, pause/resume, assignment, weekly/every-N-days/monthly schedules, and
  confirmation-protected deletion alongside today's completion workflow.
- Meals now includes recipe create/edit/delete, servings, notes, and up to 50
  ingredients alongside the existing weekly planner and shopping generation.
  Editing preserves existing web-created catalogue product links for unchanged
  ingredient rows; mobile does not expose catalogue-link editing yet.
- Added household-scoped mobile management APIs and shared contracts. Existing web
  APIs and the database schema were not changed.
- Reversible API smoke tests created, read, updated, and deleted dedicated temporary
  lists/items, chores/completions, recipes/ingredients, and a reserved meal plan.
  Guarded cleanup verified zero matching records and zero temporary sessions.
- Local validation on 2026-07-21: 128/128 tests, root/mobile strict TypeScript,
  mobile/root lint (only the three pre-existing TipTap warnings), Expo Doctor
  18/18, zero mobile production vulnerabilities, iOS/Android exports, and the web
  production compilation/page generation passed. The web build runner reached its
  known final trace-collection linger and was stopped.

## Family Workspace phase (implemented, local validation complete)

- Added a native `More` tab combining household notes, people, children, and
  conservative workspace settings.
- Notes support search, active/archive filtering, creation of safe plain-text
  notes, title/body editing for mobile-created notes, colors, pinning, archiving,
  sharing, and confirmation-protected deletion. Existing rich TipTap notes are
  readable and their metadata can be changed, but mobile refuses to flatten or
  overwrite their rich content.
- Added a household people/children overview plus safe profile-name editing and
  owner-only household-name editing. Household switching and sign out remain in
  the same tab. Destructive household/member administration is intentionally not
  exposed.
- Added household-scoped `/api/mobile/v1/notes` and `/api/mobile/v1/workspace`
  routes and shared contracts. Existing web APIs, web pages, and the database
  schema were not changed.
- The reversible live-database smoke test created, edited, pinned, recolored,
  listed, and deleted one clearly named shared temporary note. HTML-like input
  remained plain text. Cleanup verified zero matching notes and sessions.
- Final validation on 2026-07-21: 131/131 tests, root/mobile strict TypeScript,
  mobile/root lint (only the three pre-existing TipTap warnings), Expo Doctor
  18/18, zero mobile production vulnerabilities, iOS/Android exports, and the web
  production build all passed.

## Navigation & Visual Design phase (implemented, local validation complete)

- Reworked the mobile shell around exactly five primary destinations: `Home`,
  `Plan`, `Shop`, `Notes`, and `Health`. Plan contains a Chores/Meals switch;
  Family & Account is opened from Home. Legacy route files remain hidden so old
  links do not create duplicate tabs.
- Added a consistent adaptive visual system for phone and tablet: page headers,
  cards, buttons, fields, banners, empty/loading states, segmented controls,
  navigation icons, spacing, colors, and safe-area behavior.
- Rebuilt Home with navigable household summaries and useful quick actions.
- Made Notes a first-class tab and replaced the plain-only editor with a restricted
  rich editor supporting emphasis, headings, lists, undo, compatible TipTap JSON,
  colors, sharing, search, pin/archive, and authenticated image attachments. The
  editor uses an isolated `about:blank` WebView with a restrictive CSP and blocks
  external navigation. Image uploads are signature-checked, randomized, scoped,
  and limited to 3 MB.
- The note editor is vertically scrollable so all sharing and attachment controls
  remain reachable on smaller iPhones.

## Family & Health parity phase (implemented, local validation complete)

- Added native household creation, profile and household naming, people and child
  overview, owner-only role changes/removal, invitation creation/cancellation, and
  sign out in the dedicated Family & Account screen.
- Added native registration and forgot-password entry points using the hardened web
  handlers. Password-recovery email links intentionally finish in the secure web
  browser until app deep links are implemented.
- Health is now interactive with Overview, Journal, and Manage views. It supports
  child create/edit/activation, illness episode start/close/continue, fever and
  weight create/edit/delete, fully verified medicine create/edit/stop, and dose
  create/edit/delete.
- Dose safety remains server-authoritative and online-only. Minimum-gap and daily-
  limit warnings return a conflict first; recording a factual dose despite a
  warning requires an explicit confirmation and reason and is audited. The UI
  keeps clinician/label and verification warnings visible.
- Added backward-compatible `/api/mobile/v1` routes and shared contracts. Existing
  web routes were retained and no domain schema migration was needed.
- A reversible live API smoke test used a wholly temporary account, household,
  members, invitation, child, episode, readings, medicine, doses, rich note, and
  attachment. It exercised authorization, mutations, unsafe-dose conflict and
  explicit override, then removed everything. Guarded cleanup verified zero
  temporary users, households, children, episodes, medicines, notes, and sessions.
  Outbound invitation email was deliberately not sent during automation.
- All previous Shopping, Chores, Meals, Medicine, and Workspace API smoke tests
  were rerun successfully after these changes.

## Branded responsive UI + native Finance phase (implemented, local validation complete)

- Rebuilt the complete mobile visual system around the production Clankeep brand:
  blue `#4D6BFF`, purple `#7B61FF`, teal `#20C5C8`, coral `#FF6B6B`, amber
  `#EF7B06`, and green `#29A467`; Bricolage Grotesque display type; and
  Instrument Sans body type.
- Added automatic system light/dark appearance, branded gradients, consistent
  card/sheet/input/button/status primitives, 44–48 pt touch targets, phone/tablet
  breakpoints, safe-area behavior, Android keyboard resize, tablet navigation
  rail, and narrow-iPhone fallbacks.
- The current seven primary destinations are `Home`, `Plan`, `Shop`, `Finance`,
  `Bank`, `Notes`, and `Health`. Family & Account remains reachable from Home.
  Chores and Meals stay together under Plan.
- Rebuilt authentication, Home, Shopping, Chores, Meals, Notes, Family & Account,
  and Health using the new system without removing their existing mutations.
  Notes has an overflow-safe horizontal rich-text toolbar and responsive editor.
- Added Expo-managed Clankeep app icon, adaptive Android icon, optimized runtime
  logos, and light/dark splash assets inside the mobile project so native bundling
  does not depend on files outside the Expo root.
- Added native Finance and Banking workspaces. Finance keeps editable income,
  commitments, savings goals, and consented planning AI. Banking separately owns
  read-only balances, recent/full activity, 90-day category insights, and recurring
  payments. Bank connection, synchronization, transaction corrections, rules, and
  coach configuration remain on the secure web client for now.
- Added versioned `/api/mobile/v1/finance` routes and contracts. Browser and
  bearer-token finance APIs now share the same membership, Family entitlement,
  owner, bank-availability, and account-visibility authorization logic. Existing
  browser finance routes and data models remain supported; no finance or other
  schema migration was required for this phase.
- The reversible Finance smoke test created a fully temporary Family account and
  household, round-tripped income/commitment/goal mutations and summary math,
  verified planner-only bank denial, removed every temporary row, and verified
  household, user, session, income, commitment, and goal counts at zero. No real
  household finance data was changed.

## Household, checklists, AI coach, reminders, and stable Expo phase

- Home now has a prominent `Manage household` action and `Your household` card
  leading to people, invitations, children, household settings, and notification
  preferences. The existing web household experience was not replaced.
- The restricted TipTap-compatible mobile note editor now creates and edits
  checklist items, persists their checked state, and renders checked items with a
  checkbox and strike-through. Existing rich notes remain compatible. The editor
  keeps its WebView document stable while typing, constructs task lists explicitly
  for iOS, and no longer loses the keyboard or checklist state on each change.
  Existing notes open in a clean native View mode with a separate Edit action;
  note cards show compact rich previews, and editable checklist items can be
  checked directly from either the card or View mode with optimistic server save
  and rollback.
- Finance now includes a native AI Coach. It shows the exact redacted aggregate
  preview first and makes no DeepSeek request until the user explicitly consents.
  The mobile route reuses the existing planner authorization, redaction, rate
  limiting, and coach logic. A historical web consent can no longer skip the
  mobile review screen, refreshes review the payload again, and an in-flight guard
  prevents duplicate analysis requests. Bank-only tabs are hidden completely for
  households without bank enablement; customer-facing bank-unavailable/read-only
  messaging was removed at the user's request.
- Added opt-in local phone reminders for verified non-PRN next medicine doses,
  upcoming chores, planned dinners, and recurring-payment due dates. Medicine
  reminder times come only from the server-authoritative `nextDoseAt`; unverified,
  PRN, and daily-limit-reached schedules are excluded. Reminders are best-effort
  phone alerts and never replace the medicine label or Health-screen verification.
  Household settings now includes an immediate local test alert. On 2026-07-22
  the user received it on their real iPhone and tapping it opened Health.
- Mobile authentication now coalesces concurrent expired-token requests behind
  one rotating refresh operation and retries late 401 responses with the newest
  access token, avoiding the refresh-token race exposed by reminder synchronization.
- The restricted development gateway now rejects every non-mobile `/api/*` path
  itself, so neither legacy web APIs nor arbitrary web pages are published through
  the Expo address.
- Replaced changing localhost.run links with the stable Expo Go address
  `exp://clankeep-dev.217-160-174-130.sslip.io`. Caddy terminates HTTPS using
  `/etc/caddy/sites-enabled/clankeep-mobile-dev.caddy` and forwards only to the
  loopback combined gateway. The address remains stable while the VPS keeps public
  IP `217.160.174.130`; moving to a branded Clankeep hostname later would require an
  explicit DNS change.
- Added `scripts/start-mobile-stable-dev.mjs` and the root command
  `CLANKEEP_ENV_FILE=/home/ryan/lovable-temp2/.env npm run mobile:stable:dev` to
  start the isolated API, restricted proxy, combined gateway, and Metro together.
  The ignored `apps/mobile/.env.local` now intentionally retains the stable HTTPS
  API base rather than an expiring tunnel URL.

## Supermarket comparison parking (implemented, local validation complete)

- Confirmed the native app has no supermarket comparison, offers, catalogue
  search, retailer, or price UI. Those features remain intentionally parked until
  an individual retailer provides written consent and is explicitly reviewed for
  mobile enablement.
- Removed retailer metadata from the mobile shopping queries. The existing
  `store` response field is retained for backward wire compatibility but is now
  always `null`, so legacy retailer names on shopping items do not reach a phone.
  Underlying shopping items and catalogue links were not deleted or rewritten.
- Added a regression test that fails if mobile shopping begins exposing comparison
  UI, price fields, offer fields, or retailer metadata before that policy changes.
- Updated the mobile README with the consent requirement. No schema change,
  database write, native signing, store submission, or device-session restart was
  needed for implementation. The updated app was subsequently deployed to the
  existing stable Expo Go development channel; it was not signed or submitted to
  an app store.
- Validation on 2026-07-22 passed: 151/151 root tests using a non-live placeholder
  database URL, strict root/mobile TypeScript, mobile lint, `git diff --check`,
  Expo Doctor 18/18, zero mobile production vulnerabilities, and fresh iOS and
  Android exports. Validation used the available Node 24.16.0; Node 22 remains the
  documented release target and `.nvmrc` still says 20.11.1.

## AI shopping tidy and aisle route (implemented and deployed to Expo Go)

- Shopping now groups active items into a stable supermarket-style route so
  related departments, including Chilled & Dairy, stay together while shopping.
  The default route has eleven controlled categories; any household member can
  reorder the shared route with accessible up/down controls.
- Item editing includes a manual department picker. The shared route is stored in
  the nullable `Household.shoppingCategoryOrder` JSON field added by append-only
  migration `20260722233000_shopping_category_order`.
- Family households have a native `Tidy with AI` review flow. Every run first
  shows the exact payload and requires consent. It includes only active item text,
  quantities, counts and categories plus ingredients from an explicitly selected
  meal-plan week. People, completed history, notes, retailers, catalogue links and
  prices remain excluded.
- DeepSeek can propose bounded updates, safe duplicate merges, categorisation and
  missing selected meal ingredients. New items must be grounded in an ingredient
  reference. Suggestions are individually selectable, meal additions start
  unselected, and a signed 15-minute proposal fails safely if the list changes.
- Added bearer-authenticated category-order and shopping-AI preview/suggest/apply
  routes under `/api/mobile/v1/shopping`, shared server validation, contracts and
  security tests. Supermarket comparison remains parked and retailer response
  metadata remains `null`.
- A reversible live smoke test changed only a clearly named temporary list/item,
  temporarily changed and then restored the household aisle route, reviewed the
  AI payload without calling DeepSeek, and removed its temporary mobile session.
  Guarded cleanup found zero temporary lists and sessions.
- Validation on 2026-07-22 passed: 157/157 root tests, strict root/mobile
  TypeScript, root/mobile lint (only the three pre-existing root TipTap warnings),
  Expo Doctor 18/18, zero mobile production vulnerabilities, fresh iOS and Android
  exports, and `git diff --check`. Both Next builds compiled and generated all 19
  pages; the production web Docker build also finalized traces and deployed cleanly
  from the web worktree.

## Finance money-flow accounts (implemented and deployed)

- Added planning-only accounts that mirror a family's bank-account structure
  without representing, connecting to, or moving real bank money. The starter
  creates a private personal account plus shared family-spending, commitments,
  and savings accounts; custom accounts and monthly buffers are supported.
- Income, commitments, and savings goals can be assigned to accessible planning
  accounts. Savings goals retain the deadline-based pace and can use a manual
  monthly contribution override. The money-flow view shows each account's monthly
  need, planned funding, remaining amount, and weekly family-spending guide without
  double-counting transfers as spending.
- Added fixed monthly funding rules and per-month transfer check-offs. Completed
  periods retain their amount snapshot even if a rule changes later, and archived
  rules remain visible for months with completed history.
- Account privacy is enforced server-side. Shared accounts are household-visible;
  a private account and its assigned entries are visible only to its owner. Other
  household members see only an opaque `Private contribution` amount/status when
  it funds a shared target. Shared-account edits remain household-scoped; only the
  private owner manages that account or its privacy.
- Added a consent-first AI organiser. Every run shows the exact payload before any
  DeepSeek request, uses only opaque references, account roles, categories, and
  rounded figures, and excludes names, labels, bank data, and identifiers. Returned
  changes are grounded, individually selectable, signed for 15 minutes, stale-state
  protected, and cannot delete records, change privacy, or move shared data into a
  private account.
- Added append-only migration `20260723010000_finance_plan_accounts`, shared
  contracts, mobile bearer APIs, web APIs, native Finance UI, legal disclosures,
  privacy cleanup for departing members, deterministic calculations, and security
  tests in both worktrees.
- The reversible live Finance smoke test used a wholly temporary Family household,
  round-tripped starter accounts, assignments, a funding rule, a transfer check-off,
  and the exact AI preview, then removed every temporary row. It made no external AI
  request and cleanup was verified at zero.
- Release validation on 2026-07-22 passed: 128/128 web tests, 163/163 mobile-root
  tests, strict TypeScript in both roots and the native app, root/native lint with
  only the three existing TipTap warnings, Prisma validation, Expo Doctor 18/18,
  complete web and mobile-API production builds, and fresh iOS/Android exports.
  A verified pre-migration backup is at
  `/home/ryan/backups/houseflow/houseflow-20260722T223025Z.sql.gz` with its SHA-256
  file. The migration and production web container deployed successfully; the
  stable Expo Go launcher was restarted afterward.

## Finance “This month” UX redesign (implemented and deployed)

- Renamed the default Finance planning tab from `Money flow` to `This month` on
  web and native mobile. The page now answers what must be moved this month before
  showing account setup details.
- Outstanding transfers appear first with a total still to move, month controls,
  direct completion/reopen actions, and completed transfers de-emphasized below.
  The summary keeps visible income, planned allocation, and unallocated/shortfall
  as supporting figures instead of competing page sections.
- Web now has one organiser tray and compact account buckets. Items can be assigned
  by accessible desktop/keyboard drag-and-drop or the explicit `Move to` fallback.
  Account contents are collapsed by default and expose required, planned, gap/ready,
  and weekly-spending status.
- Native mobile uses the same hierarchy without touch dragging. `Organise items`
  opens a focused tap-to-move sheet, with unassigned/all filters and expandable
  account contents. This avoids drag gestures conflicting with phone scrolling.
- Assignment changes are optimistic on both surfaces, roll back on request failure,
  and provide an eight-second Undo action. Moving into a private account requires
  explicit confirmation that the item will disappear from other household members.
  Existing server-side membership/privacy enforcement remains authoritative.
- No schema, migration, calculation, AI-payload, or banking behavior changed. Web
  added exact dependency `@dnd-kit/core` 6.3.1 for accessible assignment dragging;
  native mobile added no gesture dependency.
- Rendered QA used a wholly temporary Family household at desktop and 390px widths.
  It verified the action hierarchy, balanced 2×2 narrow-screen Finance tabs, organiser
  tray, account summaries, private badge, and transfer checklist. Guarded cleanup
  found zero temporary users and households.
- Release validation on 2026-07-23 passed: 131/131 web tests, 166/166 mobile-root
  tests, strict TypeScript, root/native lint with only the three existing TipTap
  warnings, Expo Doctor 18/18, both Next production builds, fresh iOS/Android
  exports, and `git diff --check`. The reversible Finance API smoke test passed and
  removed all temporary rows.
- Production web redeployed without a data migration; the migration service reported
  no pending migrations and app/reminder health is current. Stable Expo Go was
  restarted and returned manifest 200, health 200, unauthenticated assignment 401,
  and blocked legacy Finance API 404.

## Finance and Banking split (implemented and deployed; supersedes “This month” UI)

- At the user’s request, the temporary `This month` experience was removed from
  native Finance. Finance now opens directly on `My plan` and contains only the
  household plan plus consented planning AI.
- Connected-bank balances, activity, insights, and recurring payments moved into
  a separate top-level `Bank` destination and `/banking` route. Recurring-payment
  notification taps now open Banking.
- The planning-account assignment controls and native tap-to-move organiser were
  removed from the customer UI. Existing stored account/assignment/funding data,
  append-only schema, privacy enforcement, and APIs were preserved so this can be
  redesigned later without deleting household data.
- Validation on 2026-07-23 passed: 164/164 mobile-root tests with a non-live
  placeholder database URL, strict root/native TypeScript, native/root lint with
  only the three pre-existing TipTap warnings, Expo Doctor 18/18, fresh iOS and
  Android exports, and `git diff --check`. The web build also compiled and generated
  the new `/banking` and revised `/finances` pages.
- Production web was rebuilt and deployed on 2026-07-23. The migration gate found
  no pending migrations; the app/database became healthy and the reminder poll is
  fresh. Both `/finances` and `/banking` now require authentication.
- Stable Expo Go was restarted and its compiled iOS bundle contains the new Finance
  and Banking screens. Public verification returned manifest 200, restricted
  health 200, unauthenticated mobile Banking 401, and blocked legacy web Finance
  API 404. No app-store signing/submission or database migration was performed.

## Last verified state

- Supermarket comparison remains absent from the native UI, and mobile shopping
  responses now redact stored retailer names to `null`. The production web app and
  price worker were separately parked from the original web worktree; do not deploy
  the older root web stack from this mobile branch over that production release.
- Stable Expo Go deployment verification on 2026-07-22 returned 200 for the Expo
  manifest and restricted `/api/health`, 401 for unauthenticated mobile bootstrap,
  and 404 for a blocked legacy web Finance API. The separate production web health
  endpoint remained 200.
- The AI shopping update is live on the stable Expo Go development channel at
  `exp://clankeep-dev.217-160-174-130.sslip.io`. Public verification returned 200
  for the manifest and health route, 401 for the new unauthenticated mobile AI
  preview, and 404 for the equivalent blocked legacy web API path.
- Final shopping-AI validation on 2026-07-22 passed: 157/157 root tests, strict
  root/mobile TypeScript, mobile lint with no issues, root lint with only the three
  pre-existing TipTap warnings, Expo Doctor 18/18, zero mobile production
  vulnerabilities, fresh iOS and Android exports, `git diff --check`, and the
  complete Next.js production build. The build compiled, generated all 19 static
  pages, finalized traces, and retained every existing web and mobile API route.
  Both exported native bundles contain the stable host and do not contain the
  retired `lhr.life` tunnel. Repeated public checks returned a valid SDK 54 Expo
  manifest and healthy `/api/health`; an existing legacy web Finance API returned
  404 through the restricted gateway.
- The real-iPhone stability checkpoint passed: household management was obvious;
  notification permission/synchronization worked; the immediate test alert opened
  Health when tapped; note task lists persisted, rendered in clean View/Edit modes,
  and could be toggled from previews; and the AI Coach showed the redacted review
  screen before analysis. The one test checklist note (`Hiii`) was deleted only
  after exact id/title/date/task-list/no-attachment guards and verified absent.
- The expanded live-database Finance smoke test passed with a wholly temporary
  account/household, including an AI coach consent preview that made no external
  request. Guarded cleanup verified zero temporary rows. The user must make the
  first real-data AI consent decision inside the app; automation did not do so.
- Validation used the machine's available Node 24.16.0. The documented project
  target remains Node 22 while `.nvmrc` still says 20.11.1; this known mismatch
  was not silently changed.
- Finance money-flow accounts are live in the production web app and on the stable
  Expo Go channel. Public checks returned 200 for production and development
  health, 200 for the SDK 54 Expo manifest, 401 for the unauthenticated mobile
  money-flow AI preview, and 404 for the blocked legacy web Finance API through the
  restricted gateway. The first real-data AI organiser request still requires the
  user's explicit in-app consent.

- Final two-phase validation on 2026-07-21 passed: 136/136 root tests, root and
  mobile strict TypeScript, mobile lint with no issues, Expo Doctor 18/18, and a
  mobile production audit with zero vulnerabilities. Root lint has no errors and
  only the same three pre-existing TipTap warnings.
- Fresh SDK 54 iOS and Android exports completed successfully. The full Next.js 16
  production build completed with exit code 0 and retained both the existing web
  routes and all versioned mobile API routes.
- `git diff --check` passed before final packaging. No deployment, signing, store
  submission, database reset, seed, or destructive migration was performed.
- Combined Daily Life + Family Workspace validation on 2026-07-21 passed:
  131/131 tests, root/mobile strict TypeScript, mobile/root lint (only the three
  pre-existing TipTap warnings), Expo Doctor 18/18, zero mobile production
  vulnerabilities, iOS/Android exports, and a complete web production build.
- `npm test` with a non-live placeholder `DATABASE_URL`: 118/118 passed.
- Root `npm run typecheck`: passed.
- Root `npm run lint`: passed with three pre-existing TipTap warnings and no errors.
- Root `PUPPETEER_SKIP_DOWNLOAD=1 npm run build`: passed; all web routes remained.
- Mobile `npm run typecheck`: passed.
- Mobile `npm run lint`: passed.
- The no-paid-account Expo Go path is now on Expo SDK 54.0.36 with React
  Native 0.81.5. Mobile typecheck and lint passed; Expo Doctor passed 18/18.
- SDK 54 `npx expo export --platform ios`: passed.
- SDK 54 `npx expo export --platform android`: passed.
- Mobile `npm audit --omit=dev`: zero vulnerabilities after pinning `uuid`
  11.1.1 and `postcss` 8.5.19.
- `git diff --check`: passed.
- A verified pre-migration backup exists at
  `/home/ryan/backups/houseflow/houseflow-20260720T213455Z.sql.gz` with its
  matching SHA-256 file.
- Migration `20260720210000_mobile_sessions` was applied successfully to the
  authorized current database. A subsequent migration-status check reported the
  schema up to date. The running web health endpoint and `/login` returned healthy.
- The isolated API was started successfully on `127.0.0.1:3001` using
  `scripts/start-mobile-dev-api.mjs`. Local `/api/health` passed; malformed mobile
  login returned 400 and unauthenticated bootstrap returned the expected 401.
- Added `scripts/start-mobile-dev-proxy.mjs`, a loopback-only gateway that permits
  only `/api/mobile/v1/*` and `/api/health`. Local and external checks confirmed
  health returns 200 while `/` and an existing web API return 404.
- After the SDK 54 move, all 118 root tests, root strict TypeScript, root lint, and
  the Next production compilation passed. Lint retained only the three existing
  TipTap warnings. The completed Next build runner lingered and was stopped after
  successful compilation and page generation.
- Validation ran with the machine's available Node 24.16.0. Project/release target
  remains Node 22; `.nvmrc` still says 20.11.1. Do not silently change runtimes.
- Shopping validation on 2026-07-21: all 122 root tests passed; root and mobile
  strict TypeScript passed; mobile and root lint passed (only the same three
  pre-existing TipTap warnings); Expo Doctor passed 18/18; mobile production audit
  reported zero vulnerabilities; both iOS and Android exports passed; and the
  Next production build compiled and generated all pages successfully. As before,
  the completed Next build runner lingered and was stopped after final build output.
- The shopping API smoke test used only a clearly named temporary list/item and a
  temporary mobile session in the user-authorized current database. Create, read,
  complete, quantity update, delete, and reload passed. Final cleanup was verified
  at zero temporary lists and zero temporary sessions.
- After shopping validation, the existing live web `/api/health` and `/login`
  both returned 200. No deployment was performed.

## Production alignment merge (2026-08-08)

Apple approved the paid Developer Program enrolment, so the branch was first
brought up to the production web line before any release work.

- `mobile/foundation` had been isolated at `ac9ab36` while
  `agent/houseflow-production-release` moved 72 commits ahead. Both lines had
  independently built shopping AI, plan accounts, and analytics, so they had
  become two implementations of the same features.
- Production is authoritative for all shared web code. The merge takes it
  verbatim; only genuinely mobile-only code was kept on top. A pre-merge
  snapshot of the previously uncommitted work is on `mobile/pre-align-backup`
  (commit `3abaf2e`) — nothing was discarded without a recoverable copy.
- Removed as superseded: the `FinanceFundingRule` money-flow design (libs, web
  and mobile routes, tests) and `planAccountId` on income/commitments.
  Production went to savings accounts, plan-account balances, and commitment
  set-aside instead, and keeps `planAccountId` for savings goals only. The Expo
  app called none of the removed routes.
- Adapted: mobile bearer routes now use the durable rate-limit store; mobile
  insights project the web banking analytics rather than a parallel analytics
  implementation (amounts are integer cents, as on the web); and
  `financeAccessForIdentity` is a split of production's `requireFinanceAccess`
  so session and bearer callers authorize through one code path.
- `tests/api-guard-coverage.test.ts` now knows the mobile guards and token
  endpoints, so mobile routes are audited to the same standard as web routes.
- Three UI prop errors (`ErrorBanner onDismiss`, `SheetHeader subtitle`) that
  pre-existed in the uncommitted work were fixed; the earlier "validated" notes
  covered committed milestones, not that WIP.
- Verified on 2026-08-08: 357/357 root tests, root and mobile strict TypeScript,
  root and mobile lint, Expo Doctor 18/18, and a production web build retaining
  all 48 mobile API routes. No deployment, signing, submission, or database
  migration was performed.
- Not yet re-run against a live database: the mobile smoke scripts. The Finance
  smoke script was trimmed to drop the removed routes and needs a fresh run
  before the next device checkpoint. The Insights screen changed units and
  should be checked on the phone.
- Still open: whether the mobile work stays in this worktree or is merged into
  `agent/houseflow-production-release` so it lives in `/var/www/clankeep`.

## App Store readiness work started (2026-08-08)

Audited the app against App Review before any build. It was not submittable:
no build configuration existed, the baked-in API base was the development
gateway, and two guideline violations were present.

Done:

- `eas.json` added. The `development` profile keeps the Expo Go gateway;
  `preview` and `production` use `https://clankeep.com`, so a store build
  cannot ship pointing at the development server. Remote version source with
  `autoIncrement` manages TestFlight build numbers.
- `app.json`: version `1.0.0` and `ios.config.usesNonExemptEncryption: false`
  so uploads do not stall on the export-compliance question.
- Guideline 5.1.1(v), in-app account deletion: the browser route's erasure moved
  to `src/lib/account-deletion.ts`, a bearer-authenticated
  `POST /api/mobile/v1/account/delete` added, and a password-confirmed delete
  card added to Family & Account. Structural tests fail if either client starts
  erasing on its own or drops the password, demo, or ownership-handover rules.
- Guideline 3.1.1, external purchase steering: the three screens that told free
  households to "upgrade on the Clankeep website" now simply state the feature
  is not on this household's plan. No external purchase path remains.

Decisions taken with the user on 2026-08-08:

- Paid plans on iOS will use RevenueCat in-app purchase, not a web hand-off.
- The store build points at the existing production domain `https://clankeep.com`.

Blocked on the user, in this order — each step needs an account only they hold:

1. `eas init` from `apps/mobile` using their Expo account, which writes
   `extra.eas.projectId`. Nothing can be built until this exists.
2. An App Store Connect app record for `com.clankeep.mobile`, then the auto-
   renewable subscription products. Their identifiers are the input RevenueCat
   needs, so this precedes any purchase code.
3. A RevenueCat account with an entitlement mapped to those products, plus the
   iOS public SDK key for `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

Note that `react-native-purchases` is a native module and does not run in Expo
Go, so purchase work can only be tested on a development build produced by step
1. Grant flow still to design: `PlanSource` currently has only `STRIPE` and
`ADMIN`, so an Apple source plus a RevenueCat webhook into the household plan is
the missing backend piece.

## Exact next step: native distribution preparation

The Expo Go stability phase is complete. The next recommended phase is preparing
a standalone native development/release path. On 2026-07-22 the user reported
completing paid Apple Developer Program enrollment and was told to wait up to two
days for Apple's review. Do not request or store their Apple password, 2FA code,
identity documents, or payment information. After the user confirms approval,
create/configure the EAS project only with their explicit confirmation, generate a
development build for broader notification/device testing, add release
observability and store privacy metadata, then prepare TestFlight. Google/Apple
sign-in and Android internal distribution are still separate unfinished phases.
Do not sign builds, publish, submit, or change production services without the
user's explicit confirmation. Continue using the permanent Expo Go address for
ordinary development until that release phase is authorized.

### Active device session

- Opened 2026-07-21, completed the stability checkpoint on 2026-07-22, and
  restarted for the Finance/Banking split on 2026-07-23.
- Isolated API: loopback `127.0.0.1:3001`; restricted mobile API proxy:
  loopback `127.0.0.1:3012`; combined Metro/restricted-API development gateway:
  loopback `127.0.0.1:3013`.
- Permanent Expo Go URL: `exp://clankeep-dev.217-160-174-130.sslip.io`. The same
  stable HTTPS gateway serves Metro plus only `/api/mobile/v1/*` and `/api/health`
  from the isolated development server. Repeated external manifest and health
  checks passed, and a legacy web Finance API path returned 404.
- Ignored `apps/mobile/.env.local` points to the same stable gateway. Fresh iOS
  and Android bundles were independently checked to contain that API base URL and
  not the retired temporary tunnel.
- The combined development gateway now returns JSON 404 directly for every
  non-mobile `/api/*` path instead of allowing Metro to answer with generic HTML.
  Repeated public checks confirmed the Expo manifest and restricted health route
  return 200 while a legacy web Finance API route returns 404.
- One orchestrated launcher currently owns the isolated API, restricted proxy,
  combined gateway, and Metro in Codex tool session `22823`. Public manifest and
  health checks pass. There is no localhost.run or Cloudflare tunnel. Tool session
  identifiers do not survive a new host session; the permanent address does.
- If services are not running in a future session, start them from this worktree
  with `CLANKEEP_ENV_FILE=/home/ryan/lovable-temp2/.env npm run mobile:stable:dev`.
  Do not delete the stable `.env.local`. Keep the service running through the
  user's device checkpoint, then update this handoff with the result.

## Historical iPhone development smoke-test log

Do not expand feature scope yet. First validate the foundation end-to-end on the
user's iPhone against a development-only database.

1. The user does not have a paid Apple Developer account. Continue using the
   validated SDK 54 Expo Go path for this development smoke test.
2. The isolated API, restricted proxy, temporary Cloudflare API tunnel, and Expo
   tunnel were stopped cleanly after the iPhone smoke test completed on
   2026-07-21. Their URLs are ephemeral and must be recreated for another device
   session. The ignored `apps/mobile/.env.local` contains an expired temporary API
   URL; never commit it and replace it before the next device test.
3. The user already installed **Expo Go**. Recreate the restricted API and Expo
   tunnels, configure a fresh ignored `apps/mobile/.env.local`, and guide them to
   reopen the project. Do not ask them to share their Clankeep password in chat.
4. The complete authentication smoke test previously passed on the user's iPhone: login,
   dashboard loading, pull-to-refresh, secure relaunch persistence, logout, logout
   persistence, privacy-safe failed login, and login again. After the 15-minute
   access token expired, logs showed dashboard 401, refresh 200, then the automatic
   dashboard retry 200. The user has only one household, so household switching is
   not applicable to their current account.
5. The device run exposed only a React Native `SafeAreaView` deprecation warning.
   Login now uses `react-native-safe-area-context` under a root `SafeAreaProvider`.
   Final mobile lint, typecheck, Expo Doctor 18/18, zero-vulnerability production
   audit, `git diff --check`, and a fresh iOS export all passed afterward.
6. Next verify Shopping on the iPhone: existing lists/items display, create a
   clearly named temporary list, add an item with a unit, change its count, mark it
   done and active, pull-to-refresh, confirm the web view sees the same changes,
   delete the temporary item, and remove the temporary list via the existing web UI.
7. In the same device session, verify Chores: today's items display, complete one
   genuinely due chore, confirm the web reflects it, reopen it, and pull-to-refresh.
8. A fresh restricted API tunnel and Expo tunnel were opened for this combined
   Shopping/Chores device test on 2026-07-21. Treat them as ephemeral and stop all
   four services after testing; replace/remove the ignored `.env.local` afterward.
9. Shopping passed on the real iPhone: existing lists loaded, `Mobile test` was
   created, `Test milk` with `2 L` was added, count changed to 3, completion
   survived refresh, reopen worked, and confirmation-protected deletion worked.
   Server logs confirmed every request. The single empty temporary `Mobile test`
   list was then removed with a guarded cleanup check.
10. Chores passed on the real iPhone. Because no real chores were due, a single
    `Mobile chore test` occurrence was created for the current date. It appeared
    after refresh, completed, remained completed after refresh, and reopened.
    Server logs confirmed the full sequence. Guarded cleanup removed the chore and
    its cascaded completion; both final counts were zero.
11. After both device tests, the API, restricted proxy, Cloudflare tunnel, and Expo
    tunnel were stopped cleanly, and the ignored temporary `.env.local` was removed.
    Meals is now implemented and locally validated. The exact next action is a real
    iPhone Meals test: reload the new fifth tab, navigate weeks, save/refresh/clear a
    temporary free-text dinner, then test a real recipe only if one exists. Ingredient
    generation should use a dedicated temporary shopping list and be cleaned up.
12. Meals passed on the real iPhone: week navigation, temporary free-text save,
    refresh persistence, clearing, existing-recipe selection, and ingredient
    generation all worked. Returning to Shopping initially required a manual refresh;
    Shopping now reloads lists/items on tab focus via `useFocusEffect`. A second
    device generation confirmed immediate focus-triggered GETs with no pull needed.
13. The test recipe plan and all resolved generated/test shopping items were removed
    with guarded identity/timestamp checks. The API, restricted proxy, Cloudflare
    tunnel, and Expo tunnel were stopped, and temporary `.env.local` was removed.
14. Post-fix validation passed again: 126/126 tests, root/mobile TypeScript and
    lint (only the three existing TipTap warnings), Expo Doctor 18/18, zero mobile
    production vulnerabilities, both native exports, and the web production build.
    Cleanup verification found zero shopping items created during the device-test
    window and zero entries in the tested next week. Live health/login stayed 200.
15. Medicine passed on the real iPhone. The user confirmed the sixth `Meds` tab,
    both children (including the zero-active empty state), the active medicine,
    dose history, and recent fever readings. There are no add/edit/give/record
    controls. Server logs confirmed successful household-scoped overview requests.
    The device test caused no health writes; the read-only smoke test also verified
    medicine, dose, and fever-reading counts remained unchanged.
16. The temporary API, restricted proxy, Cloudflare tunnel, and Expo tunnel were
    stopped after the device check, and the ignored `.env.local` was removed. Final
    validation passed again: 128/128 tests, root/mobile TypeScript, mobile lint,
    Expo Doctor 18/18, zero production vulnerabilities, and both native exports.
    Root lint retained only the three pre-existing TipTap warnings. The web build
    compiled, generated all pages, and reached final trace collection before its
    known lingering runner was stopped. Live web code was not changed or deployed.
17. Re-run all web safety gates after any fix. Record results and the next milestone
    in this file before ending the session.
18. The read-only Health overview is locally complete. The exact next action is a
    real iPhone check: confirm the tab label is `Health`; medicine, dose, and fever
    data remain correct; illness episodes show current/history state; recent weights
    display or show a truthful empty state; and no health-write controls exist.
19. The Health view was opened on the real iPhone and the user reported it good.
    Server logs confirmed bootstrap, dashboard, and household-scoped Health overview
    requests returned 200. The API, restricted proxy, Cloudflare tunnel, and Expo
    tunnel were then stopped, and the ignored `apps/mobile/.env.local` was removed.
20. The Daily Life parity phase is locally complete. The next action is one combined
    real-iPhone test using clearly named temporary data: rename/edit/delete one
    temporary shopping list and item; create/edit/pause/resume/delete one temporary
    recurring chore; and create/edit/delete one temporary recipe with ingredients.
    Do not modify existing records for this test, and clean up every temporary row.
21. The user asked to combine another phase before the next Expo run, so the Daily
    Life iPhone test is deferred. Its API, proxy, Cloudflare, and Expo services were
    stopped and the ignored `.env.local` was removed. Include Daily Life in the next
    combined device test after the Family Workspace phase is built.
22. Family Workspace is now built and locally validated. Open a fresh restricted
    API tunnel and Expo session, then test both phases together. Use only clearly
    named temporary records: one shopping list/item, one chore, one recipe, and one
    note. Verify the More tab shows the expected people and children; profile or
    household renaming is optional and should not be tested unless the user wants
    to change their real names. Delete all temporary records afterward.

## Completed device-test session

- Opened and completed 2026-07-21 for the combined Daily Life + Family Workspace
  iPhone test. The final Expo and restricted API URLs were ephemeral and are now
  expired.
- The API was loopback-only on port 3001 and the allow-list proxy was loopback-only
  on port 3012. External checks returned 200 for Expo and `/api/health`, while the
  proxy correctly returned 404 for `/`.
- The first set of temporary processes stopped and correctly produced a 404. All
  four were restarted, both fresh public endpoints were independently verified
  (Expo 200, API health 200, blocked API root 404), and the URLs above are the
  replacement addresses.
- Family Workspace passed on the real iPhone: the user confirmed Notes, People,
  Children, and Settings; created and edited `Mobile test note`; changed its
  color; pinned, archived, restored, and deleted it; and reported the complete
  flow good. Server logs confirmed every notes mutation and a guarded database
  check found zero notes with that test title afterward. Do not rename the real
  profile or household merely for testing.
- Daily Life Shopping passed on the real iPhone: a dedicated temporary list and
  item were created, edited, counted, completed/reopened, and deleted. Server logs
  confirmed the create/item-update/delete flow; guarded cleanup found zero lists
  or items with the test identifiers.
- Daily Life Chores passed on the real iPhone: a dedicated recurring chore was
  created, completed/reopened, edited, paused, and deleted. Server logs confirmed
  the mutations, including completion/reopen, and guarded cleanup found zero test
  chores and zero associated completion rows.
- Daily Life Meals/Recipes passed on the real iPhone: a dedicated two-ingredient
  recipe was created, edited, and deleted. Server logs confirmed create, multiple
  updates, reloads, and deletion; guarded cleanup found zero matching recipes and
  zero matching ingredients.
- The combined Daily Life + Family Workspace device checkpoint is complete. All
  clearly named temporary notes, shopping rows, chore/completion rows, recipes,
  and ingredients were removed and independently counted at zero. Existing user
  records were not used for destructive testing.
- After verification, Expo, Cloudflare, the restricted proxy, and the isolated API
  were stopped; no relevant listeners remained; and the ignored `.env.local` was
  removed. Live web health and login remained 200.
- One additional mobile-note DELETE appeared in the final server output for note
  id `cmrn0krbq0001qn011f59wl99`. The verified pre-test backup identifies it as an
  older empty, unshared, unpinned note titled `New Note`. The user confirmed on
  2026-07-21 that this deletion was intentional; no restoration is required.

## Known limitations of this milestone

- The mobile-session migration has been applied to the user-authorized current
  database after a verified backup; no domain data was changed.
- Real iPhone authentication, Shopping, Chores, Meals, and the read-only medicine
  and fever overview have been exercised end to end.
- Password-recovery email links finish in the secure web browser; mobile deep-link
  handling is not implemented yet.
- Opt-in local reminders are implemented, but remote server push notifications
  are not. A phone that is offline can still use already-scheduled alerts, while
  newly changed server data is synchronized the next time the app becomes active.
  Offline queues, native billing, bank setup/management, and admin screens are not
  implemented yet. Health mutations deliberately require a live server.
- Note image attachments are managed by filename in this phase; an in-app full-size
  attachment preview can be added in a later polish pass.
- Paid Apple Developer Program enrollment is awaiting Apple's review based on the
  user's 2026-07-22 report. No App Store Connect project, EAS project, signing
  credential, or store submission has been configured.
- Native generated `ios/` and `android/` projects are not committed; Expo managed
  configuration is the source of truth at this stage.
