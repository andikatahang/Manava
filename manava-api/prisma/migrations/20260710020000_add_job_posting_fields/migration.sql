-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('fulltime', 'parttime');

-- CreateEnum
CREATE TYPE "WorkSystem" AS ENUM ('remote', 'hybrid', 'onsite');

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "job_id" TEXT;

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "min_education" TEXT,
ADD COLUMN     "min_gpa" DOUBLE PRECISION,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "required_experience" TEXT,
ADD COLUMN     "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "work_system" "WorkSystem",
ADD COLUMN     "work_type" "WorkType";

-- CreateIndex
CREATE INDEX "JobApplication_job_id_idx" ON "JobApplication"("job_id");

-- CreateIndex
CREATE INDEX "JobPosting_status_idx" ON "JobPosting"("status");

-- CreateIndex
CREATE INDEX "JobPosting_created_by_id_idx" ON "JobPosting"("created_by_id");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

