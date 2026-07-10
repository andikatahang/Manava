// Payroll API client — payslips are attendance-driven: base salary minus a
// pro-rated deduction for unpaid absences, plus overtime pay derived from
// clock-out time past the schedule, plus HR-entered bonus/reimbursement.

import { api, apiBlob } from './api'

export type PayslipStatus = 'draft' | 'finalized' | 'paid' | 'voided'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Payslip {
  payslip_id: string
  editor_id: string
  editor_name: string
  period_start: string
  period_end: string
  working_days: number
  absent_days: number

  // Earnings
  base_salary: number
  overtime_minutes: number
  overtime_pay: number
  project_bonus: number
  reimbursement_total: number
  gross_salary: number

  // Deductions
  attendance_deduction: number
  presensi_penalty: number
  pph21_tax: number
  bpjs_kesehatan: number
  bpjs_tk_jkk: number
  bpjs_tk_jkm: number
  bpjs_tk_jht: number
  bpjs_tk_jp: number
  total_deductions: number

  // Net
  net_salary: number

  // Status
  status: PayslipStatus
  payment_status: PaymentStatus
  payment_batch_id: string | null
  paid_at: string | null
  payment_reference: string | null
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

// ── Payment Batch ────────────────────────────────────────────────────────────

export interface PaymentBatch {
  batch_id: string
  period: string
  total_amount: number
  payslip_count: number
  status: BatchStatus
  created_by: string
  created_at: string
  processed_at: string | null
}

export function createPaymentBatch(period: string): Promise<PaymentBatch> {
  return api('/payroll/batch/create', { method: 'POST', body: { period } })
}

export function processPaymentBatch(batch_id: string): Promise<{ batch_id: string; status: string }> {
  return api(`/payroll/batch/${batch_id}/process`, { method: 'POST' })
}

export function fetchPaymentBatches(): Promise<PaymentBatch[]> {
  return api('/payroll/batch')
}

// Download the bank-transfer CSV for a batch (authenticated blob fetch).
export async function downloadPaymentBatchCsv(batch_id: string, period: string): Promise<void> {
  const blob = await apiBlob(`/payroll/batch/${batch_id}/export`)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payroll-${period}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Payroll Settings ────────────────────────────────────────────────────────

export interface PayrollSettings {
  id: string
  bpjs_kesehatan_rate: number
  bpjs_tk_jkk_rate: number
  bpjs_tk_jkm_rate: number
  bpjs_tk_jht_rate: number
  bpjs_tk_jp_rate: number
  pph21_bracket_1_limit: number
  pph21_bracket_1_rate: number
  pph21_bracket_2_limit: number
  pph21_bracket_2_rate: number
  pph21_bracket_3_rate: number
  presensi_penalty_per_day: number
  updated_at: string
}

export function fetchPayrollSettings(): Promise<PayrollSettings> {
  return api('/payroll/settings')
}

export function updatePayrollSettings(data: Partial<PayrollSettings>): Promise<PayrollSettings> {
  return api('/payroll/settings', { method: 'PATCH', body: data })
}

// ── Tax Report ────────────────────────────────────────────────────────────────

export function fetchTaxReport(period: string): Promise<any> {
  return api(`/payroll/reports/tax?period=${period}`)
}

export const STATUS_LABELS: Record<PayslipStatus, string> = {
  draft: 'Draft', finalized: 'Siap Dibayar', paid: 'Dibayar', voided: 'Dibatalkan',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu', processing: 'Diproses', completed: 'Selesai', failed: 'Gagal',
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  pending: 'Menunggu', processing: 'Diproses', completed: 'Selesai', failed: 'Gagal',
}