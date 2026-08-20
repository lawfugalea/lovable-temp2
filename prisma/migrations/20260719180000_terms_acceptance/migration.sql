-- Record Terms/Privacy acceptance captured at registration.
-- Additive and nullable: safe to apply with `prisma migrate deploy` on a live
-- database (no table rewrite, no backfill, existing rows keep NULL).
ALTER TABLE "User" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
