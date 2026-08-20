-- Note HTML is displayed at /notes. A relative image URL follows whatever
-- basePath the deployment uses instead of being pinned to the domain root.
UPDATE "Note"
SET "content" = replace(
  "content",
  '/api/uploads/note-image?file=',
  'api/uploads/note-image?file='
)
WHERE "content" LIKE '%/api/uploads/note-image?file=%';

UPDATE "Note"
SET "contentJson" = replace(
  "contentJson"::text,
  '/api/uploads/note-image?file=',
  'api/uploads/note-image?file='
)::jsonb
WHERE "contentJson" IS NOT NULL
  AND "contentJson"::text LIKE '%/api/uploads/note-image?file=%';
