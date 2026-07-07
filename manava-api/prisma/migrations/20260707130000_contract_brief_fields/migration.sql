-- Contract sebagai formulir briefing pada alur booking klien:
-- title (judul proyek yang ditawarkan) dan revision_limit (batas revisi, default 5).
-- Kolom lama yang tidak ada di formulir brief diberi default agar insert brief
-- tidak wajib mengisinya; data historis tidak berubah.
ALTER TABLE "Contract" ADD COLUMN "title" TEXT;
ALTER TABLE "Contract" ADD COLUMN "revision_limit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Contract" ALTER COLUMN "style" SET DEFAULT '';
ALTER TABLE "Contract" ALTER COLUMN "key_elements" SET DEFAULT '';
ALTER TABLE "Contract" ALTER COLUMN "estimated_duration_days" SET DEFAULT 0;
