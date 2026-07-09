export type UserRole = 'superadmin' | 'hr_admin' | 'admin_manager' | 'editor' | 'client' | 'mediator' | 'finance'

export interface User {
  user_id: string
  full_name: string
  email: string
  username?: string
  role: UserRole
  avatar?: string
  is_active: boolean
  // Still on the shared default password (auto-created editor accounts) —
  // triggers the update-password prompt after login.
  password_is_default?: boolean
}

// Lightweight roster entry used by attendance team views (editors or managers).
export interface TeamMember {
  id: string
  full_name: string
  department: string
  avatar?: string
}

// A department groups editors under one Admin Manager.
export interface Department {
  id: string
  name: string
  manager_id: string   // User id of the Admin Manager who leads the department
  member_ids: string[] // editor_id references
}

export interface Editor {
  editor_id: string
  user_id: string
  full_name: string
  email: string
  department: string
  specialization: string[]
  // Confidential — the API only includes it for HR roles or the record owner.
  base_salary?: number
  status: 'active' | 'suspended'
  onboarded_at: string
  rating: number
  completion_rate: number
  active_projects: number
  performance_band: 'excellent' | 'good' | 'needs_improvement'
  avatar?: string
  // Included by GET /editors and GET /departments (list endpoints join metrics).
  metrics?: EditorMetrics | null
}

export interface Applicant {
  applicant_id: string
  job_id: string
  name: string
  email: string
  tahap: 'applied' | 'screening' | 'interview' | 'offered' | 'offer_accepted' | 'confirmed' | 'rejected' | 'offer_expired'
  score?: number
  portfolio_url: string
  created_at: string
  offer_accepted_at?: string
  avatar?: string
}

export interface JobPosting {
  job_id: string
  title: string
  specialization: string[]
  status: 'open' | 'closed'
  created_at: string
  applicant_count: number
}

export type ProjectStatus = 'draft' | 'awaiting_dp' | 'in_progress' | 'in_review' | 'revision' | 'disputed' | 'completed' | 'cancelled'

export interface Project {
  project_id: string
  client_id: string
  client_name: string
  editor_id: string
  editor_name: string
  title: string
  description: string
  status: ProjectStatus
  dp_amount: number
  final_amount: number
  project_value: number
  started_at?: string
  completed_at?: string
  created_at: string
  // GET /projects menyertakan flag ini untuk CTA "Beri Ulasan" milik klien.
  has_review?: boolean
}

export interface RevisionEnvelope {
  envelope_id: string
  project_id: string
  included_scope: string
  excluded_scope: string
  allowance_count: number
  allowance_consumed: number
}

export interface Contract {
  contract_id: string
  project_id: string
  // Terisi pada brief dari alur booking; null pada kontrak historis lama.
  title?: string | null
  scope: string
  style: string
  key_elements: string
  estimated_duration_days: number
  revision_limit: number
  project_value: number
  status: 'draft' | 'pending_client_approval' | 'active' | 'superseded' | 'closed' | 'rejected'
  issued_at: string
  approved_at?: string
}

export interface RevisionRequest {
  revision_id: string
  project_id: string
  request_text: string
  ai_label: 'minor' | 'major' | 'uncertain'
  ai_confidence: number
  final_label?: 'minor' | 'major'
  price?: number
  status: 'submitted' | 'awaiting_topup' | 'accepted' | 'in_progress' | 'resubmitted' | 'disputed' | 'resolved' | 'cancelled'
  created_at: string
}

export interface Payslip {
  payslip_id: string
  editor_id: string
  editor_name: string
  period_start: string
  period_end: string
  base_salary: number
  attendance_deduction: number
  project_bonus: number
  reimbursement_total: number
  net_salary: number
  status: 'draft' | 'finalized' | 'paid' | 'voided'
  generated_at: string
}

export interface AttendanceRecord {
  date: string
  clock_in?: string
  clock_out?: string
  status: 'present' | 'absent' | 'partial' | 'leave'
}

export interface LeaveRequest {
  leave_id: string
  // Requester is a User (editors and admin managers both file leave).
  requester_id: string
  requester_name: string
  // Role of whoever filed the request. Drives approval routing up the hierarchy:
  // an 'editor' request is approved by Admin Manager, an 'admin_manager' request
  // is approved by HR Admin.
  requester_role: 'editor' | 'admin_manager'
  leave_type: 'cuti' | 'izin'
  start_date: string
  end_date: string
  reason?: string // optional context from requester (max 500 chars)
  status: 'pending' | 'approved' | 'rejected'
  // Audit trail: who decided and when (populated on approve/reject).
  decided_by_id?: string
  decided_by_name?: string
  decided_at?: string
  decision_note?: string
  created_at: string
}

export interface Dispute {
  dispute_id: string
  project_id: string
  project_title: string
  client_name: string
  editor_name: string
  opened_by: string
  opened_by_role: 'client' | 'editor'
  reason: string
  evidence?: string[]
  status: 'open' | 'in_mediation' | 'resolved' | 'cancelled'
  resolution_type?: 'free_revision' | 'charge_justified' | 'partial_refund' | 'full_refund' | 'quality_sanction'
  resolution_note?: string
  opened_at: string
  resolved_at?: string
  sla_deadline: string
}

export interface Review {
  review_id: string
  project_id: string
  rating: number
  comment: string
  reviewer_name: string
  created_at: string
}

export interface MonthlyKpiPoint {
  department: string
  period: string // "YYYY-MM"
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
  kpi_average: number
  editor_count: number
}

export interface EditorMetrics {
  editor_id: string
  editor_name: string
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
  kpi_average: number
  performance_band: 'excellent' | 'good' | 'needs_improvement'
}

export interface Message {
  message_id: string
  project_id: string
  sender_id: string
  sender_name: string
  sender_role: UserRole
  body: string
  message_type: 'text' | 'brief' | 'deliverable' | 'revision_request' | 'ai_summary' | 'system'
  attachment?: string | null
  created_at: string
}

// Item inbox ruang proyek (GET /projects/inbox): pesan terbaru dari lawan
// bicara lintas semua proyek milik viewer.
export interface InboxItem extends Message {
  project_title: string
  project_status: ProjectStatus
}

// Hasil klasifikasi AI untuk permintaan revisi (POST /projects/:id/revisions/classify).
export interface RevisionClassification {
  label: 'minor' | 'major' | 'uncertain'
  confidence: number
  summary: string
  source: 'openai' | 'heuristic'
  allowance: { count: number; consumed: number }
}

// Ulasan pada profil editor (GET /editors/:id/reviews).
export interface EditorReview extends Review {
  project_title: string
}

// File yang dapat diunduh klien setelah proyek selesai (GET /projects/:id/download).
export interface DownloadableFile {
  message_id: string
  note: string
  download_url: string
  preview_url: string | null
  created_at: string
  file_label: string
}

export interface EscrowAccount {
  escrow_id: string
  project_id: string
  project_title: string
  client_name: string
  held_balance: number
  released_balance: number
  refunded_balance: number
  updated_at: string
}

export interface Transaction {
  transaction_id: string
  project_id: string
  project_title: string
  type: 'dp_payment' | 'final_payment' | 'major_topup' | 'escrow_hold' | 'escrow_release' | 'refund' | 'payroll'
  amount: number
  status: 'pending' | 'success' | 'failed' | 'voided'
  created_at: string
}

// Department Reporting
export interface AttendanceSummary {
  total_days: number
  present_count: number
  late_count: number
  absent_count: number
  leave_count: number
  present_pct: number
  late_pct: number
  absent_pct: number
  leave_pct: number
  top_editors: Array<{ name: string; present_count: number }>
}

export interface KpiSummary {
  avg_kpi: number
  excellent_count: number
  good_count: number
  needs_count: number
  improved_editors: Array<{ name: string; current_kpi: number; change: number }>
  declined_editors: Array<{ name: string; current_kpi: number; change: number }>
}

export interface LeaveSummary {
  approved_count: number
  rejected_count: number
  pending_count: number
  cuti_approved: number
  izin_approved: number
}

export interface WarningSummary {
  total_count: number
  ringan_count: number
  sedang_count: number
  berat_count: number
  repeat_offenders: Array<{ name: string; count: number }>
}

// Klaim Dana Operasional Proyek (reimbursement)
export type ReimbursementStatus = 'pending' | 'approved' | 'rejected'

export interface ReimbursementClaim {
  claim_id: string
  user_id: string
  user_name: string
  amount: number
  purpose: string
  status: ReimbursementStatus
  decided_at: string | null
  created_at: string
}

export interface ReimbursementSummary {
  approved_count: number
  approved_total: number
  pending_count: number
}

// Laporan bulanan individual editor (Summary Bulanan Karyawan):
// draft (agregasi otomatis) → submitted (dikirim ke Admin Manager) → consolidated
export type EditorReportStatus = 'draft' | 'submitted' | 'consolidated'

export interface EditorReportData {
  report_id: string | null
  user_id: string
  editor_name: string
  department: string
  period: string
  status: EditorReportStatus
  kpi_summary: {
    avg_client_rating: number
    completion_rate: number
    manager_rating: number
    kpi_average: number
  }
  attendance_summary: {
    total_days: number
    present: number
    late: number
    absent: number
    leave: number
  }
  leave_summary: {
    cuti_approved: number
    izin_approved: number
    pending: number
  }
  project_summary: Array<{ title: string; status: string }>
  editor_notes: string | null
  submitted_at: string | null
}

// Siklus MIS laporan: draft (agregasi otomatis) → forwarded (diteruskan ke HR Admin)
export type ReportStatus = 'draft' | 'forwarded'

export interface DepartmentReportData {
  id: string
  department_id: string
  department_name: string
  manager_id: string
  manager_name: string
  period: string
  status: ReportStatus
  forwarded_at: string | null
  attendance_summary: AttendanceSummary
  kpi_summary: KpiSummary
  leave_summary: LeaveSummary
  warning_summary: WarningSummary
  reimbursement_summary: ReimbursementSummary | null
  editor_reports: EditorReportData[] | null
  ai_narrative: string | null
  manager_notes: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface ForwardReportRequest {
  period: string
  manager_notes?: string
}

// Draft otomatis dari GET /reports/draft — belum tentu tersimpan di DB
export interface DraftReportData {
  department_id: string
  department_name: string
  period: string
  status: ReportStatus
  persisted: boolean
  forwarded_at: string | null
  manager_notes: string | null
  attendance_summary: AttendanceSummary
  kpi_summary: KpiSummary
  leave_summary: LeaveSummary
  warning_summary: WarningSummary
  reimbursement_summary: ReimbursementSummary | null
  editor_reports: EditorReportData[] | null
  ai_narrative: string | null
}

export interface ReportListResponse {
  id: string
  department_name: string
  manager_name: string
  period: string
  status: ReportStatus
  forwarded_at: string | null
  submitted_at: string
}
