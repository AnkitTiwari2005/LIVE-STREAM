-- Add deletion request timestamp to User for pandits awaiting payout settlement and admin deletion approval.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMPTZ;

-- Add permanent unique slug to StreamerProfile (replacing runtime SLUG_TO_SEARCH name matching).
ALTER TABLE "StreamerProfile" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(120);

-- Deterministically backfill canonical slugs for existing curated pandits by account email.
UPDATE "StreamerProfile" AS sp
SET "slug" = mapping."slug"
FROM (
  VALUES
    ('tripathiayush068@gmail.com', 'rohit-tiwari'),
    ('rohit.tiwari@shubhdarshan.com', 'rohit-tiwari'),
    ('s.k.jyotish@gmail.com', 'santosh-shastri'),
    ('skjyotish@gmail.com', 'santosh-shastri'),
    ('ravipathak8877@gmail.com', 'ravi-pathak'),
    ('ravi.pathak@shubhdarshan.com', 'ravi-pathak'),
    ('nitinsharma3797@gmail.com', 'nitin-sharma'),
    ('nitin.sharma@shubhdarshan.com', 'nitin-sharma'),
    ('umeshdubey867@gmail.com', 'umesh-shastri'),
    ('umesh.shastri@shubhdarshan.com', 'umesh-shastri'),
    ('kdtripathi481@gmail.com', 'kuber-tripathi'),
    ('kuber.tripathi@shubhdarshan.com', 'kuber-tripathi'),
    ('subhash.shastri@shubhdarshan.com', 'subhash-shastri'),
    ('sumitpachori8@gmail.com', 'sumit-shastri'),
    ('nandkishortripathi893@gmail.com', 'nandkishor-tripathi')
) AS mapping("email", "slug")
JOIN "User" AS u ON LOWER(u."email") = mapping."email"
WHERE sp."userId" = u."id"
  AND sp."slug" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "StreamerProfile" x WHERE x."slug" = mapping."slug");

-- Backfill unique fallback slugs for any remaining non-deleted StreamerProfile rows.
UPDATE "StreamerProfile" AS sp
SET "slug" = COALESCE(
  NULLIF(
    TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(u."name"), '[^a-z0-9]+', '-', 'g')),
    ''
  ),
  'pandit'
) || '-' || LEFT(REPLACE(sp."id", '-', ''), 8)
FROM "User" AS u
WHERE sp."userId" = u."id"
  AND sp."slug" IS NULL
  AND u."deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerProfile_slug_key" ON "StreamerProfile"("slug");
