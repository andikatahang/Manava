-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Editor" ADD COLUMN     "bank_account_name" TEXT,
ADD COLUMN     "bank_account_no" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "npwp" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "bpjs_kesehatan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bpjs_tk_jht" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bpjs_tk_jkk" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bpjs_tk_jkm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bpjs_tk_jp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gross_salary" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_batch_id" TEXT,
ADD COLUMN     "payment_reference" TEXT,
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "pph21_tax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "presensi_penalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_deductions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bpjs_kesehatan_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "bpjs_tk_jkk_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0024,
    "bpjs_tk_jkm_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.003,
    "bpjs_tk_jht_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "bpjs_tk_jp_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "pph21_bracket_1_limit" INTEGER NOT NULL DEFAULT 5000000,
    "pph21_bracket_1_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "pph21_bracket_2_limit" INTEGER NOT NULL DEFAULT 50000000,
    "pph21_bracket_2_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "pph21_bracket_3_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "presensi_penalty_per_day" INTEGER NOT NULL DEFAULT 100000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBatch" (
    "batch_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "payslip_count" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'pending',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("batch_id")
);

-- CreateIndex
CREATE INDEX "PaymentBatch_period_idx" ON "PaymentBatch"("period");

-- CreateIndex
CREATE INDEX "PaymentBatch_status_idx" ON "PaymentBatch"("status");

-- CreateIndex
CREATE INDEX "Payslip_payment_batch_id_idx" ON "Payslip"("payment_batch_id");

-- CreateIndex
CREATE INDEX "Payslip_payment_status_idx" ON "Payslip"("payment_status");

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payment_batch_id_fkey" FOREIGN KEY ("payment_batch_id") REFERENCES "PaymentBatch"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;
