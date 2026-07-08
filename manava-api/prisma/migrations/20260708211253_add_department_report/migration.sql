-- CreateTable
CREATE TABLE "DepartmentReport" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "attendance_summary" JSONB NOT NULL,
    "kpi_summary" JSONB NOT NULL,
    "leave_summary" JSONB NOT NULL,
    "warning_summary" JSONB NOT NULL,
    "manager_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentReport_department_id_period_key" ON "DepartmentReport"("department_id", "period");

-- CreateIndex
CREATE INDEX "DepartmentReport_manager_id_idx" ON "DepartmentReport"("manager_id");

-- CreateIndex
CREATE INDEX "DepartmentReport_period_idx" ON "DepartmentReport"("period");

-- AddForeignKey
ALTER TABLE "DepartmentReport" ADD CONSTRAINT "DepartmentReport_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentReport" ADD CONSTRAINT "DepartmentReport_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "AdminManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
