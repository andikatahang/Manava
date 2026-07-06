-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "ai_confidence" DOUBLE PRECISION,
ADD COLUMN     "ai_department" TEXT,
ADD COLUMN     "ai_source" TEXT NOT NULL DEFAULT 'heuristic';
