import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260715210000_reconcile_health_notes_and_scoping/migration.sql'),
  'utf8',
)
const integrityMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260715213000_household_integrity_and_cascades/migration.sql'),
  'utf8',
)
const multiHouseholdMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260726120000_multi_household_membership/migration.sql'),
  'utf8',
)
const durableRateLimitMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260726140000_durable_rate_limits/migration.sql'),
  'utf8',
)
const financeMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260716090000_finance_open_banking/migration.sql'),
  'utf8',
)
const securityMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260716210000_secure_invites_and_note_attachments/migration.sql'),
  'utf8',
)
const attachmentPathMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260716213000_portable_note_attachment_paths/migration.sql'),
  'utf8',
)
const healthJournalMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260717150000_health_journal_and_push/migration.sql'),
  'utf8',
)
const choresMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260718120000_chores_and_recurrence/migration.sql'),
  'utf8',
)
const mealsMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260718150000_meal_planner/migration.sql'),
  'utf8',
)
const demoMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260718180000_demo_mode/migration.sql'),
  'utf8',
)
const billingMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260719120000_household_billing/migration.sql'),
  'utf8',
)
const plannerMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260719150000_money_planner/migration.sql'),
  'utf8',
)
const planAccountMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260723010000_finance_plan_accounts/migration.sql'),
  'utf8',
)
const planAccountBalanceMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260723120000_finance_plan_account_balance/migration.sql'),
  'utf8',
)
const onboardingMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260725120000_user_onboarding_state/migration.sql'),
  'utf8',
)
const savingsMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260723160000_savings_accounts/migration.sql'),
  'utf8',
)
const choreIconMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260804090000_chore_icon/migration.sql'),
  'utf8',
)

test('schema reconciliation adds every missing application model', () => {
  assert.match(migration, /User_email_lower_key/)
  assert.match(migration, /ADD COLUMN "householdId" TEXT/)
  assert.match(migration, /CREATE TABLE "FeverReading"/)
  assert.match(migration, /CREATE TABLE "Note"/)
  assert.match(migration, /CREATE TABLE "NoteCollaborator"/)
})

test('schema reconciliation preserves custom search infrastructure', () => {
  assert.doesNotMatch(migration, /DROP TABLE\s+"?search_synonym"?/i)
  assert.doesNotMatch(migration, /DROP COLUMN\s+"?fts"?/i)
  assert.doesNotMatch(migration, /DROP INDEX.*(?:trgm|fts|gin)/i)
})

test('destructive parent operations use database cascades', () => {
  assert.match(migration, /ShoppingItem_listId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(migration, /ShoppingList_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(migration, /ShoppingTemplate_householdId_fkey[\s\S]*ON DELETE CASCADE/)
})

test('household integrity migration refuses ambiguous legacy memberships', () => {
  assert.match(integrityMigration, /HAVING COUNT\(\*\) > 1/)
  assert.match(integrityMigration, /RAISE EXCEPTION/)
  assert.match(integrityMigration, /CREATE UNIQUE INDEX "Membership_userId_key"/)
})

test('multi-household migration drops only the single-household constraint', () => {
  // The composite unique is what stops a user being added to the same household
  // twice. Dropping it by accident would let duplicate memberships through, so
  // the migration must touch the per-user index and nothing else. Comments are
  // stripped first: the migration explains itself by naming both indexes, and
  // only executable SQL is in scope here.
  const sql = multiHouseholdMigration.replace(/^\s*--.*$/gm, '')
  assert.match(sql, /DROP INDEX IF EXISTS "Membership_userId_key"/)
  assert.doesNotMatch(sql, /Membership_userId_householdId_key/)
  assert.doesNotMatch(sql, /DELETE FROM/)
  assert.doesNotMatch(sql, /DROP TABLE/)
})

test('durable rate limit migration is additive and indexed for sweeping', () => {
  const sql = durableRateLimitMigration.replace(/^\s*--.*$/gm, '')
  assert.match(sql, /CREATE TABLE "RateLimitCounter"/)
  assert.match(sql, /CREATE INDEX "RateLimitCounter_resetAt_idx"/)
  // Nothing existing may be touched: this ships alongside a live auth path.
  assert.doesNotMatch(sql, /ALTER TABLE "User"/)
  assert.doesNotMatch(sql, /DROP/)
  assert.doesNotMatch(sql, /DELETE FROM/)
})

test('household integrity migration protects orphan-prone relations', () => {
  assert.match(integrityMigration, /PageState_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(integrityMigration, /Household_ownerId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(integrityMigration, /Membership_userId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(integrityMigration, /MedicineDose_childId_fkey[\s\S]*ON DELETE CASCADE/)
})

test('finance migration scopes ownership, sharing, and destructive cleanup', () => {
  assert.match(financeMigration, /CREATE TABLE "BankConnection"/)
  assert.match(financeMigration, /CREATE TABLE "BankAccountShare"/)
  assert.match(financeMigration, /BankConnection_userId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(financeMigration, /BankAccountShare_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(financeMigration, /BankTransaction_accountId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(financeMigration, /BankAccount_connectionId_identificationHash_key/)
  assert.match(financeMigration, /BankTransaction_accountId_deduplicationKey_key/)
})

test('security migration hashes invite credentials and scopes note attachments', () => {
  assert.match(securityMigration, /digest\("token", 'sha256'\)/)
  assert.match(securityMigration, /CREATE TABLE "NoteAttachment"/)
  assert.match(securityMigration, /NoteAttachment_filename_noteId_key/)
  assert.match(securityMigration, /NoteAttachment_noteId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(securityMigration, /regexp_matches[\s\S]*contentJson/)
  assert.match(securityMigration, /api\/uploads\/note-image\?file=/)
})

test('attachment path migration keeps legacy images portable under a base path', () => {
  assert.match(attachmentPathMigration, /'\/api\/uploads\/note-image\?file='/)
  assert.match(attachmentPathMigration, /'api\/uploads\/note-image\?file='/)
  assert.match(attachmentPathMigration, /"contentJson"::text/)
})

test('health journal migration preserves historical events in inferred episodes', () => {
  assert.match(healthJournalMigration, /CREATE TABLE "HealthEpisode"/)
  assert.match(healthJournalMigration, /interval '72 hours'/)
  assert.match(healthJournalMigration, /UPDATE "MedicineDose"[\s\S]*SET "episodeId"/)
  assert.match(healthJournalMigration, /UPDATE "FeverReading"[\s\S]*SET "episodeId"/)
  assert.doesNotMatch(healthJournalMigration, /DELETE FROM "(?:MedicineDose|FeverReading|Medicine|Child)"/)
})

test('health journal push delivery is private and idempotent at the database boundary', () => {
  assert.match(healthJournalMigration, /CREATE TABLE "PushSubscription"/)
  assert.match(healthJournalMigration, /CREATE TABLE "PushDelivery"/)
  assert.match(healthJournalMigration, /PushDelivery_subscriptionId_medicineId_scheduledAt_key/)
  assert.match(healthJournalMigration, /MedicineDose_episodeId_fkey[\s\S]*ON DELETE RESTRICT/)
})

test('chores migration is additive with household-scoped cascade semantics', () => {
  assert.match(choresMigration, /CREATE TABLE "Chore"/)
  assert.match(choresMigration, /CREATE TABLE "ChoreCompletion"/)
  assert.match(choresMigration, /Chore_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(choresMigration, /ChoreCompletion_choreId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(choresMigration, /Chore_assigneeId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(choresMigration, /ChoreCompletion_completedById_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(choresMigration, /ChoreCompletion_choreId_dueDate_key/)
  assert.doesNotMatch(choresMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('meal planner migration is additive with correct cascade semantics', () => {
  assert.match(mealsMigration, /CREATE TABLE "Recipe"/)
  assert.match(mealsMigration, /CREATE TABLE "RecipeIngredient"/)
  assert.match(mealsMigration, /CREATE TABLE "MealPlanEntry"/)
  assert.match(mealsMigration, /Recipe_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(mealsMigration, /RecipeIngredient_canonicalProductId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(mealsMigration, /MealPlanEntry_householdId_date_slot_key/)
  assert.doesNotMatch(mealsMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('demo mode migration is additive and defaults everyone to non-demo', () => {
  assert.match(demoMigration, /ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false/)
  assert.match(demoMigration, /ADD COLUMN "demoExpiresAt" TIMESTAMP/)
  assert.doesNotMatch(demoMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('money planner migration is additive with correct cascade semantics', () => {
  assert.match(plannerMigration, /CREATE TABLE "IncomeSource"/)
  assert.match(plannerMigration, /CREATE TABLE "Commitment"/)
  assert.match(plannerMigration, /CREATE TABLE "SavingsGoal"/)
  assert.match(plannerMigration, /IncomeSource_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(plannerMigration, /IncomeSource_userId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(plannerMigration, /Commitment_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(plannerMigration, /Commitment_userId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(plannerMigration, /SavingsGoal_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.doesNotMatch(plannerMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('plan account migration is additive and never orphans planner entries', () => {
  assert.match(planAccountMigration, /CREATE TABLE "FinancePlanAccount"/)
  assert.match(planAccountMigration, /CREATE TABLE "FinanceFundingRule"/)
  assert.match(planAccountMigration, /CREATE TABLE "FinanceTransferCheckoff"/)
  assert.match(planAccountMigration, /FinancePlanAccount_householdId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(planAccountMigration, /FinancePlanAccount_ownerUserId_fkey[\s\S]*ON DELETE CASCADE/)
  // Archiving an account must never delete the commitment it was funding.
  assert.match(planAccountMigration, /Commitment_planAccountId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(planAccountMigration, /IncomeSource_planAccountId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(planAccountMigration, /SavingsGoal_planAccountId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(planAccountMigration, /FinanceTransferCheckoff_ruleId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.match(planAccountMigration, /FinanceTransferCheckoff_completedById_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(planAccountMigration, /FinanceFundingRule_sourceAccountId_targetAccountId_key/)
  assert.doesNotMatch(planAccountMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('savings migration carries the monthly figure over before dropping anything', () => {
  // The new column has to exist and be populated before the old one is dropped, or the
  // household loses the only per-account monthly amount it had typed in.
  const addColumn = savingsMigration.indexOf('ADD COLUMN "monthlyContributionCents"')
  const carryOver = savingsMigration.indexOf('SET "monthlyContributionCents" = "monthlyBufferCents"')
  const dropColumn = savingsMigration.indexOf('DROP COLUMN "monthlyBufferCents"')
  assert.ok(addColumn >= 0 && carryOver > addColumn && dropColumn > carryOver)
  assert.match(savingsMigration, /ADD COLUMN "monthlyContributionCents" INTEGER NOT NULL DEFAULT 0/)
  // Income, commitments, and goals themselves survive — only the account link goes.
  assert.doesNotMatch(savingsMigration, /DROP TABLE "(IncomeSource|Commitment|SavingsGoal)"/)
  assert.doesNotMatch(savingsMigration, /DELETE FROM/)
  assert.doesNotMatch(savingsMigration, /"SavingsGoal" DROP COLUMN "planAccountId"/)
})

test('plan account balance migration is additive and defaults to a zero balance', () => {
  assert.match(planAccountBalanceMigration, /ADD COLUMN "openingBalanceCents" INTEGER NOT NULL DEFAULT 0/)
  assert.match(planAccountBalanceMigration, /ADD COLUMN "openingBalanceAt" DATE/)
  assert.doesNotMatch(planAccountBalanceMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('onboarding migration is additive and does not ambush existing users', () => {
  assert.match(onboardingMigration, /ADD COLUMN "tourStepId" TEXT/)
  assert.match(onboardingMigration, /ADD COLUMN "tourCompletedAt" TIMESTAMP\(3\)/)
  assert.match(onboardingMigration, /ADD COLUMN "checklistDismissedAt" TIMESTAMP\(3\)/)
  // All three are nullable with no default, so the ALTER TABLE stays metadata-only
  // on a live production table rather than rewriting every row.
  assert.doesNotMatch(onboardingMigration, /ADD COLUMN "(tourStepId|tourCompletedAt|checklistDismissedAt)"[^,;]*(NOT NULL|DEFAULT)/)
  // Accounts that predate the tour must not be handed a coach mark on next login.
  assert.match(onboardingMigration, /UPDATE "User" SET "tourCompletedAt" = CURRENT_TIMESTAMP/)
  // The old household-scoped dismissal carries over, so a dismissed card stays dismissed.
  assert.match(onboardingMigration, /ps\."data" ->> 'dismissed'\) = 'true'/)
  assert.match(onboardingMigration, /SET "checklistDismissedAt" = ps\."updatedAt"/)
  assert.doesNotMatch(onboardingMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('billing migration is additive, defaults to FREE, and only comps the known owner', () => {
  assert.match(billingMigration, /ADD COLUMN "plan" "HouseholdPlan" NOT NULL DEFAULT 'FREE'/)
  assert.match(billingMigration, /CREATE TABLE "BillingEvent"/)
  assert.match(billingMigration, /UPDATE "Household" SET "plan" = 'FAMILY', "planSource" = 'ADMIN'/)
  assert.match(billingMigration, /lower\(u\."email"\) = 'lawfinuu@gmail\.com'/)
  assert.doesNotMatch(billingMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
})

test('the chore icon migration only adds a nullable column', () => {
  assert.match(choreIconMigration, /ALTER TABLE "Chore" ADD COLUMN "icon" TEXT;/)
  // Additive only: no data loss, and safe to deploy before the code that uses it.
  assert.doesNotMatch(choreIconMigration, /DROP|DELETE|TRUNCATE|NOT NULL/i)
})
