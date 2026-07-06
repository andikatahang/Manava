export type UserRole = 'superadmin' | 'hr_admin' | 'admin_manager' | 'editor' | 'client' | 'mediator' | 'finance'

export interface User {
  user_id: string
  full_name: string
  email: string
  username?: string
  role: UserRole
  avatar?: string
  is_active: boolean
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
  manager_id: string   // TeamMember id from mockAdminManagers
  member_ids: string[] // editor_id references
}

export interface Editor {
  editor_id: string
  user_id: string
  full_name: string
  email: string
  department: string
  specialization: string[]
  base_salary: number
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
  scope: string
  style: string
  key_elements: string
  estimated_duration_days: number
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
  attachment?: string
  created_at: string
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
