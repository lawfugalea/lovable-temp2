-- The consent-lifecycle worker emails a connection owner before their bank
-- consent lapses and when a sync discovers reauthorization is needed. These
-- stamps make each of those emails once-per-episode: they are cleared when a
-- reconnect installs a fresh consent, and checked before sending.
ALTER TABLE "BankConnection" ADD COLUMN "consentReminderSentAt" TIMESTAMP(3);
ALTER TABLE "BankConnection" ADD COLUMN "reauthNotifiedAt" TIMESTAMP(3);
