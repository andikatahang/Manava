-- Klaim Dana Operasional Proyek: editor mengajukan, admin manager memutuskan
CREATE TABLE "ReimbursementClaim" (
    "claim_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReimbursementClaim_pkey" PRIMARY KEY ("claim_id")
);

CREATE INDEX "ReimbursementClaim_user_id_idx" ON "ReimbursementClaim"("user_id");
CREATE INDEX "ReimbursementClaim_status_idx" ON "ReimbursementClaim"("status");

ALTER TABLE "ReimbursementClaim" ADD CONSTRAINT "ReimbursementClaim_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
