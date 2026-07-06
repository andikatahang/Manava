-- Profile fields are now AI-extracted from the CV instead of typed by the
-- applicant, so they may be absent. Add the screening verdict column.
ALTER TABLE "JobApplication" ALTER COLUMN "age" DROP NOT NULL;
ALTER TABLE "JobApplication" ALTER COLUMN "education" DROP NOT NULL;
ALTER TABLE "JobApplication" ALTER COLUMN "gpa" DROP NOT NULL;
ALTER TABLE "JobApplication" ALTER COLUMN "graduation_year" DROP NOT NULL;
ALTER TABLE "JobApplication" ADD COLUMN "ai_meets_criteria" BOOLEAN;
