-- Add unique username to User. Existing rows are backfilled from the email
-- local part; collisions get a numeric suffix so the unique index can build.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User" SET "username" = split_part("email", '@', 1);

WITH dup AS (
  SELECT "user_id",
         ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "created_at", "user_id") AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = u."username" || dup.rn
FROM dup
WHERE u."user_id" = dup."user_id" AND dup.rn > 1;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
