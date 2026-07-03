-- Repoint LeaveRequest identity from Editor to User so Admin Managers
-- (who have no Editor row) can file their own leave requests.
-- Existing rows are migrated by mapping editor_id -> Editor.user_id.

ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_editor_id_fkey";

ALTER TABLE "LeaveRequest" RENAME COLUMN "editor_id" TO "requester_id";
ALTER TABLE "LeaveRequest" RENAME COLUMN "editor_name" TO "requester_name";

-- Map existing editor ids to their owning user ids.
UPDATE "LeaveRequest" lr
SET "requester_id" = e."user_id"
FROM "Editor" e
WHERE lr."requester_id" = e."editor_id";

-- Defensive: drop rows that cannot be attributed to any user.
DELETE FROM "LeaveRequest" lr
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."user_id" = lr."requester_id");

ALTER INDEX "LeaveRequest_editor_id_idx" RENAME TO "LeaveRequest_requester_id_idx";

ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "User"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
