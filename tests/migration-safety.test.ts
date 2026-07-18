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
