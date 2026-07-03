-- Link warnings to the target's User account so the recipient can see the
-- warnings issued against them and get notified. Existing rows are backfilled
-- best-effort by matching target_name + target_role against User.

ALTER TABLE "Warning" ADD COLUMN "target_user_id" TEXT;

UPDATE "Warning" w
SET "target_user_id" = u."user_id"
FROM "User" u
WHERE u."full_name" = w."target_name"
  AND u."role"::text = w."target_role"::text;

CREATE INDEX "Warning_target_user_id_idx" ON "Warning"("target_user_id");

ALTER TABLE "Warning"
  ADD CONSTRAINT "Warning_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "User"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
