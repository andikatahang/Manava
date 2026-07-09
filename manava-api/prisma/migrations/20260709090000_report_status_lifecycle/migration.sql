-- MIS lifecycle untuk DepartmentReport: draft → forwarded (diteruskan ke HR Admin)
ALTER TABLE "DepartmentReport" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "DepartmentReport" ADD COLUMN "forwarded_at" TIMESTAMP(3);
ALTER TABLE "DepartmentReport" ADD COLUMN "reimbursement_summary" JSONB;

-- Laporan yang sudah ada sebelum migrasi ini dibuat lewat submit manual → anggap sudah diteruskan
UPDATE "DepartmentReport" SET "status" = 'forwarded', "forwarded_at" = "submitted_at";
