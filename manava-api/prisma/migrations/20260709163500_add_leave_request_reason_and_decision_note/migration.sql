-- AlterTable: Add reason and decision fields to LeaveRequest
ALTER TABLE "LeaveRequest" ADD COLUMN "reason" TEXT,
ADD COLUMN "decided_by_id" TEXT,
ADD COLUMN "decided_by_name" TEXT,
ADD COLUMN "decided_at" TIMESTAMP(3),
ADD COLUMN "decision_note" TEXT;

-- CreateIndex: Add index on decided_by_id for foreign key performance
CREATE INDEX "LeaveRequest_decided_by_id_idx" ON "LeaveRequest"("decided_by_id");

-- AddForeignKey: Link decided_by_id to User table
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
