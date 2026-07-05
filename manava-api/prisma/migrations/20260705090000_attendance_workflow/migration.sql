-- Attendance workflow rework:
--  * records belong to Users (Admin Managers / HR Admins clock in too)
--  * clock times become real timestamps
--  * missing clock-out → status 'incomplete' + HR review (approve/reject)
--  * standing schedule config + auto-rotating daily code
-- AttendanceRecord was never populated (seed only deletes), so drop+recreate.

-- AlterEnum: new attendance outcomes. Postgres 16 allows ADD VALUE inside a
-- transaction as long as the new value is not used in the same transaction.
ALTER TYPE "AttendanceStatus" ADD VALUE 'late';
ALTER TYPE "AttendanceStatus" ADD VALUE 'incomplete';

-- CreateEnum
CREATE TYPE "AttendanceReview" AS ENUM ('none', 'pending', 'approved', 'rejected');

-- DropTable (empty — safe)
DROP TABLE "AttendanceRecord";

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clock_in" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "review" "AttendanceReview" NOT NULL DEFAULT 'none',
    "adjusted_clock_out" TIMESTAMP(3),
    "adjusted_by_id" TEXT,
    "adjusted_at" TIMESTAMP(3),
    "adjustment_note" TEXT,
    "user_explanation" TEXT,
    "proposed_clock_out" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clock_in_time" TEXT NOT NULL DEFAULT '08:00',
    "clock_out_time" TEXT NOT NULL DEFAULT '17:00',
    "grace_minutes" INTEGER NOT NULL DEFAULT 10,
    "code_duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCode" (
    "date" DATE NOT NULL,
    "code" TEXT NOT NULL,
    "generated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCode_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_user_id_date_key" ON "AttendanceRecord"("user_id", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_review_idx" ON "AttendanceRecord"("review");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_adjusted_by_id_fkey" FOREIGN KEY ("adjusted_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
