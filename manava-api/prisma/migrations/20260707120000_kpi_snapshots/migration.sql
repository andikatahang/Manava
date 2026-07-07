-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "avg_client_rating" DOUBLE PRECISION NOT NULL,
    "completion_rate" INTEGER NOT NULL,
    "manager_rating" DOUBLE PRECISION NOT NULL,
    "kpi_average" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiSnapshot_editor_id_period_key" ON "KpiSnapshot"("editor_id", "period");

-- CreateIndex
CREATE INDEX "KpiSnapshot_department_period_idx" ON "KpiSnapshot"("department", "period");

-- CreateIndex
CREATE INDEX "KpiSnapshot_period_idx" ON "KpiSnapshot"("period");

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;
