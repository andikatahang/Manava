-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('superadmin', 'hr_admin', 'admin_manager', 'editor', 'client', 'mediator', 'finance');

-- CreateEnum
CREATE TYPE "EditorStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "PerformanceBand" AS ENUM ('excellent', 'good', 'needs_improvement');

-- CreateEnum
CREATE TYPE "ApplicantStage" AS ENUM ('applied', 'screening', 'interview', 'offered', 'offer_accepted', 'confirmed', 'rejected', 'offer_expired');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'awaiting_dp', 'in_progress', 'in_review', 'revision', 'disputed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'pending_client_approval', 'active', 'superseded', 'closed', 'rejected');

-- CreateEnum
CREATE TYPE "RevisionAiLabel" AS ENUM ('minor', 'major', 'uncertain');

-- CreateEnum
CREATE TYPE "RevisionFinalLabel" AS ENUM ('minor', 'major');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('submitted', 'awaiting_topup', 'accepted', 'in_progress', 'resubmitted', 'disputed', 'resolved', 'cancelled');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('draft', 'finalized', 'paid', 'voided');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'partial', 'leave');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('cuti', 'izin');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RequesterRole" AS ENUM ('editor', 'admin_manager');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'in_mediation', 'resolved', 'cancelled');

-- CreateEnum
CREATE TYPE "DisputeOpenerRole" AS ENUM ('client', 'editor');

-- CreateEnum
CREATE TYPE "DisputeResolutionType" AS ENUM ('free_revision', 'charge_justified', 'partial_refund', 'full_refund', 'quality_sanction');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'brief', 'deliverable', 'revision_request', 'ai_summary', 'system');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('dp_payment', 'final_payment', 'major_topup', 'escrow_hold', 'escrow_release', 'refund', 'payroll');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed', 'voided');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('ringan', 'sedang', 'berat');

-- CreateEnum
CREATE TYPE "WarningStatus" AS ENUM ('aktif', 'diakui', 'kedaluwarsa');

-- CreateEnum
CREATE TYPE "WarningTargetRole" AS ENUM ('editor', 'admin_manager');

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Editor" (
    "editor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "specialization" TEXT[],
    "base_salary" INTEGER NOT NULL,
    "status" "EditorStatus" NOT NULL DEFAULT 'active',
    "onboarded_at" TIMESTAMP(3) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completion_rate" INTEGER NOT NULL DEFAULT 0,
    "active_projects" INTEGER NOT NULL DEFAULT 0,
    "performance_band" "PerformanceBand" NOT NULL DEFAULT 'good',
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Editor_pkey" PRIMARY KEY ("editor_id")
);

-- CreateTable
CREATE TABLE "AdminManager" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "department_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("department_id","editor_id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clock_in" TEXT,
    "clock_out" TEXT,
    "status" "AttendanceStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "leave_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "editor_name" TEXT NOT NULL,
    "requester_role" "RequesterRole" NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "target_role" "WarningTargetRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" "WarningSeverity" NOT NULL,
    "status" "WarningStatus" NOT NULL DEFAULT 'aktif',
    "issued_by_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorMetrics" (
    "editor_id" TEXT NOT NULL,
    "editor_name" TEXT NOT NULL,
    "avg_client_rating" DOUBLE PRECISION NOT NULL,
    "completion_rate" INTEGER NOT NULL,
    "manager_rating" DOUBLE PRECISION NOT NULL,
    "kpi_average" DOUBLE PRECISION NOT NULL,
    "performance_band" "PerformanceBand" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorMetrics_pkey" PRIMARY KEY ("editor_id")
);

-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "editor_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "dp_amount" INTEGER NOT NULL,
    "final_amount" INTEGER NOT NULL,
    "project_value" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "RevisionEnvelope" (
    "envelope_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "included_scope" TEXT NOT NULL,
    "excluded_scope" TEXT NOT NULL,
    "allowance_count" INTEGER NOT NULL,
    "allowance_consumed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RevisionEnvelope_pkey" PRIMARY KEY ("envelope_id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "contract_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "key_elements" TEXT NOT NULL,
    "estimated_duration_days" INTEGER NOT NULL,
    "project_value" INTEGER NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "RevisionRequest" (
    "revision_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "request_text" TEXT NOT NULL,
    "ai_label" "RevisionAiLabel" NOT NULL,
    "ai_confidence" DOUBLE PRECISION NOT NULL,
    "final_label" "RevisionFinalLabel",
    "price" INTEGER,
    "status" "RevisionStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionRequest_pkey" PRIMARY KEY ("revision_id")
);

-- CreateTable
CREATE TABLE "Message" (
    "message_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_role" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL,
    "attachment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "dispute_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "editor_name" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_by_role" "DisputeOpenerRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT[],
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution_type" "DisputeResolutionType",
    "resolution_note" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "sla_deadline" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("dispute_id")
);

-- CreateTable
CREATE TABLE "Review" (
    "review_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "payslip_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "editor_name" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "base_salary" INTEGER NOT NULL,
    "attendance_deduction" INTEGER NOT NULL DEFAULT 0,
    "project_bonus" INTEGER NOT NULL DEFAULT 0,
    "reimbursement_total" INTEGER NOT NULL DEFAULT 0,
    "net_salary" INTEGER NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'draft',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("payslip_id")
);

-- CreateTable
CREATE TABLE "EscrowAccount" (
    "escrow_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "held_balance" INTEGER NOT NULL DEFAULT 0,
    "released_balance" INTEGER NOT NULL DEFAULT 0,
    "refunded_balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowAccount_pkey" PRIMARY KEY ("escrow_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "job_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "specialization" TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicant_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "applicant_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tahap" "ApplicantStage" NOT NULL DEFAULT 'applied',
    "score" INTEGER,
    "portfolio_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offer_accepted_at" TIMESTAMP(3),
    "avatar" TEXT,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("applicant_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Editor_user_id_key" ON "Editor"("user_id");

-- CreateIndex
CREATE INDEX "Editor_status_idx" ON "Editor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminManager_user_id_key" ON "AdminManager"("user_id");

-- CreateIndex
CREATE INDEX "Department_manager_id_idx" ON "Department"("manager_id");

-- CreateIndex
CREATE INDEX "DepartmentMember_editor_id_idx" ON "DepartmentMember"("editor_id");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_editor_id_date_key" ON "AttendanceRecord"("editor_id", "date");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_editor_id_idx" ON "LeaveRequest"("editor_id");

-- CreateIndex
CREATE INDEX "Warning_status_idx" ON "Warning"("status");

-- CreateIndex
CREATE INDEX "Warning_severity_idx" ON "Warning"("severity");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_client_id_idx" ON "Project"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionEnvelope_project_id_key" ON "RevisionEnvelope"("project_id");

-- CreateIndex
CREATE INDEX "Contract_project_id_idx" ON "Contract"("project_id");

-- CreateIndex
CREATE INDEX "RevisionRequest_project_id_idx" ON "RevisionRequest"("project_id");

-- CreateIndex
CREATE INDEX "Message_project_id_idx" ON "Message"("project_id");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Review_project_id_idx" ON "Review"("project_id");

-- CreateIndex
CREATE INDEX "Payslip_status_idx" ON "Payslip"("status");

-- CreateIndex
CREATE INDEX "Payslip_period_start_idx" ON "Payslip"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowAccount_project_id_key" ON "EscrowAccount"("project_id");

-- CreateIndex
CREATE INDEX "Transaction_project_id_idx" ON "Transaction"("project_id");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Applicant_job_id_idx" ON "Applicant"("job_id");

-- CreateIndex
CREATE INDEX "Applicant_tahap_idx" ON "Applicant"("tahap");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Editor" ADD CONSTRAINT "Editor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminManager" ADD CONSTRAINT "AdminManager_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "AdminManager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorMetrics" ADD CONSTRAINT "EditorMetrics_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionEnvelope" ADD CONSTRAINT "RevisionEnvelope_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "Editor"("editor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowAccount" ADD CONSTRAINT "EscrowAccount_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
