-- CreateTable
CREATE TABLE "RecruitmentSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentSetting_pkey" PRIMARY KEY ("id")
);
