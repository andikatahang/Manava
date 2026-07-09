-- Laporan bulanan individual editor (Summary Bulanan Karyawan)
CREATE TABLE "EditorReport" (
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "kpi_summary" JSONB NOT NULL,
    "attendance_summary" JSONB NOT NULL,
    "leave_summary" JSONB NOT NULL,
    "project_summary" JSONB NOT NULL,
    "editor_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorReport_pkey" PRIMARY KEY ("report_id")
);

CREATE UNIQUE INDEX "EditorReport_user_id_period_key" ON "EditorReport"("user_id", "period");
CREATE INDEX "EditorReport_period_idx" ON "EditorReport"("period");

ALTER TABLE "EditorReport" ADD CONSTRAINT "EditorReport_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Snapshot laporan editor yang dikonsolidasi ke laporan departemen
ALTER TABLE "DepartmentReport" ADD COLUMN "editor_reports" JSONB;
