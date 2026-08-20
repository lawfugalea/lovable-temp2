-- Invite links are bearer credentials. Keep existing links valid while
-- replacing plaintext database values with SHA-256 digests.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "Invite"
SET "token" = encode(digest("token", 'sha256'), 'hex');

-- Bind uploaded note images to an authorized note. Existing image references
-- are recovered from both the legacy text field and TipTap JSON documents.
CREATE TABLE "NoteAttachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteAttachment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NoteAttachment" ("id", "filename", "noteId", "uploadedById", "createdAt")
SELECT DISTINCT
    'legacy_' || md5(note."id" || ':' || (match_result.parts)[1]),
    (match_result.parts)[1],
    note."id",
    note."createdById",
    note."createdAt"
FROM "Note" AS note
CROSS JOIN LATERAL regexp_matches(
    COALESCE(note."content", '') || ' ' || COALESCE(note."contentJson"::text, ''),
    '(note-[0-9]+-[a-z0-9]+(\.(jpg|jpeg|png|gif|webp))?)',
    'gi'
) AS match_result(parts)
;

-- Old editor versions stored a public path. Route those references through the
-- authenticated attachment endpoint without changing the bearer filename.
UPDATE "Note"
SET "content" = regexp_replace(
  "content",
  '/uploads/notes/(note-[0-9]+-[a-z0-9]+(\.(jpg|jpeg|png|gif|webp))?)',
  '/api/uploads/note-image?file=\1',
  'gi'
)
WHERE "content" ~* '/uploads/notes/note-';

UPDATE "Note"
SET "contentJson" = regexp_replace(
  "contentJson"::text,
  '/uploads/notes/(note-[0-9]+-[a-z0-9]+(\.(jpg|jpeg|png|gif|webp))?)',
  '/api/uploads/note-image?file=\1',
  'gi'
)::jsonb
WHERE "contentJson" IS NOT NULL
  AND "contentJson"::text ~* '/uploads/notes/note-';

CREATE UNIQUE INDEX "NoteAttachment_filename_noteId_key" ON "NoteAttachment"("filename", "noteId");
CREATE INDEX "NoteAttachment_noteId_idx" ON "NoteAttachment"("noteId");
CREATE INDEX "NoteAttachment_uploadedById_idx" ON "NoteAttachment"("uploadedById");

ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
