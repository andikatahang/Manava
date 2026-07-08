// Types untuk department reporting module

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

export interface DepartmentReportData {
  id: string
  department_id: string
  department_name: string
  manager_id: string
  manager_name: string
  period: string
  attendance_summary: AttendanceSummary
  kpi_summary: KpiSummary
  leave_summary: LeaveSummary
  warning_summary: WarningSummary
  manager_notes: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface CreateReportRequest {
  period: string
  manager_notes?: string
}

export interface ReportListResponse {
  id: string
  department_name: string
  manager_name: string
  period: string
  submitted_at: string
}
