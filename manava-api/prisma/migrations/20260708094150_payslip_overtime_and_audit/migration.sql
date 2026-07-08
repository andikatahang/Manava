-- AlterTable
ALTER TABLE "Payslip"
  ADD COLUMN "working_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "absent_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overtime_pay" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_editor_id_period_start_key" ON "Payslip"("editor_id", "period_start");
