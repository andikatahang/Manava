// Payroll API client — payslips are attendance-driven: base salary minus a
// pro-rated deduction for unpaid absences, plus overtime pay derived from
// clock-out time past the schedule, plus HR-entered bonus/reimbursement.

import { api } from './api'

export type PayslipStatus = 'draft' | 'finalized' | 'paid' | 'voided'

export interface Payslip {
  payslip_id: string
  editor_id: string
  editor_name: string
  period_start: string
  period_end: string
  working_days: number
  absent_days: number
  base_salary: number
  attendance_deduction: number
  overtime_minutes: number
  overtime_pay: number
  project_bonus: number
  reimbursement_total: number
  net_salary: number
  status: PayslipStatus
  generated_at: string
}

export interface GenerateOneResult {
  payslip: Payslip
  regenerated: boolean
}

export interface GenerateBulkResult {
  total: number
  generated: number
  skipped: number
}

// Single editor (editor_id set) or bulk for all active editors in the period.
export function generatePayslips(period: string, editor_id?: string): Promise<GenerateOneResult | GenerateBulkResult> {
  return api('/payroll/generate', { method: 'POST', body: editor_id ? { period, editor_id } : { period } })
}

export interface PayslipListParams {
  period?: string // YYYY-MM
  status?: PayslipStatus
  editor_id?: string
}

export function fetchPayslips(params: PayslipListParams = {}): Promise<Payslip[]> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString()
  return api<Payslip[]>(`/payroll${qs ? `?${qs}` : ''}`)
}

export function fetchMyPayslips(): Promise<Payslip[]> {
  return api<Payslip[]>('/payroll/mine')
}

export function fetchPayslip(id: string): Promise<Payslip> {
  return api<Payslip>(`/payroll/${id}`)
}

export function adjustPayslip(
  id: string,
  body: { project_bonus?: number; reimbursement_total?: number },
): Promise<Payslip> {
  return api<Payslip>(`/payroll/${id}`, { method: 'PATCH', body })
}

export function finalizePayslip(id: string): Promise<Payslip> {
  return api<Payslip>(`/payroll/${id}/finalize`, { method: 'PATCH' })
}

export function payPayslip(id: string): Promise<Payslip> {
  return api<Payslip>(`/payroll/${id}/pay`, { method: 'PATCH' })
}

export function voidPayslip(id: string): Promise<Payslip> {
  return api<Payslip>(`/payroll/${id}/void`, { method: 'PATCH' })
}

export const STATUS_LABELS: Record<PayslipStatus, string> = {
  draft: 'Draft', finalized: 'Siap Dibayar', paid: 'Dibayar', voided: 'Dibatalkan',
}
