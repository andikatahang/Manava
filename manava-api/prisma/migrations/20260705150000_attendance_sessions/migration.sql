-- Presensi rework: the auto-rotating daily code + schedule window is replaced
-- by sessions HR opens manually ("Buka Presensi") with a type (masuk/keluar)
-- and an explicit duration. Users clock in/out only while a session of that
-- type is active, typing its code — clock-out now requires a code too.

-- CreateEnum
CREATE TYPE "AttendanceSessionType" AS ENUM ('masuk', 'keluar');

-- DropTable (daily-code table; codes are ephemeral — safe to drop)
DROP TABLE "AttendanceCode";

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AttendanceSessionType" NOT NULL,
    "code" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "opened_by_id" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSession_date_idx" ON "AttendanceSession"("date");

-- CreateIndex
CREATE INDEX "AttendanceSession_type_expires_at_idx" ON "AttendanceSession"("type", "expires_at");
