-- Make ownerId nullable to support multiple owners
ALTER TABLE "Household" ALTER COLUMN "ownerId" DROP NOT NULL;
