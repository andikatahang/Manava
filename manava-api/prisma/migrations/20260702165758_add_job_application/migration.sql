-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('new', 'interview', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "JobApplication" (
    "application_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "skills" TEXT[],
    "cv_name" TEXT NOT NULL,
    "cv_mime" TEXT NOT NULL,
    "cv_data" TEXT NOT NULL,
    "ai_summary" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'new',
    "invited_at" TIMESTAMP(3),
    "interview_email" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_user_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("application_id")
);

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_email_idx" ON "JobApplication"("email");
