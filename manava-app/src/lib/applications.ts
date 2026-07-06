// Job-application API client. Candidates submit from the public /apply page;
// HR admin reviews via /recruitment. A localStorage flag guards against the
// same browser re-submitting the current vacancy (the server also rejects a
// second active application for the same email).

import { api, apiBlob } from './api'

export type ApplicationStatus = 'new' | 'interview' | 'approved' | 'rejected'

// Profile fields are AI-extracted from the CV (nullable — a CV may not
// state them); the applicant only types name/email/phone.
export interface JobApplication {
  application_id: string
  full_name: string
  email: string
  age: number | null
  phone: string
  education: string | null
  gpa: number | null
  graduation_year: number | null
  skills: string[]
  cv_name: string
  cv_mime: string
  ai_summary: string
  ai_source: 'openai' | 'heuristic'
  ai_confidence: number | null
  ai_department: string | null
  ai_meets_criteria: boolean | null
  status: ApplicationStatus
  invited_at: string | null
  interview_email: string | null
  decided_at: string | null
  created_user_id: string | null
  submitted_at: string
}

export interface SubmitApplicationInput {
  full_name: string
  email: string
  phone: string
  cv_name: string
  cv_data: string // data URL (PDF/DOC, max 5MB)
}

// ── Vacancy criteria shown on the /apply form ─────────────────────────────

export interface VacancyCriterion {
  label: string
  value: string
}

export function fetchVacancyCriteria(): Promise<VacancyCriterion[]> {
  return api<VacancyCriterion[]>('/applications/criteria')
}

// Editor account auto-created when HR approves a candidate.
export interface CreatedAccount {
  user_id: string
  username: string
  email: string
  temp_password: string
}

// Delivery status of a real SMTP send — surfaced so HR knows whether the
// candidate actually received the email or needs manual follow-up.
export interface MailResult {
  delivered: boolean
  error?: string
}

export interface ShortlistResult {
  application: JobApplication
  email: MailResult
}

export interface ApproveResult {
  application: JobApplication
  account: CreatedAccount
  email: MailResult
}

export function submitApplication(input: SubmitApplicationInput): Promise<JobApplication> {
  return api<JobApplication>('/applications', { method: 'POST', body: input })
}

export function fetchApplications(): Promise<JobApplication[]> {
  return api<JobApplication[]>('/applications')
}

export function fetchApplication(id: string): Promise<JobApplication> {
  return api<JobApplication>(`/applications/${id}`)
}

export function fetchCvBlob(id: string): Promise<Blob> {
  return apiBlob(`/applications/${id}/cv`)
}

export interface InterviewDetails {
  interviewer: string
  mode: 'online' | 'offline'
  location?: string
}

export function shortlistApplication(id: string, details: InterviewDetails): Promise<ShortlistResult> {
  return api<ShortlistResult>(`/applications/${id}/shortlist`, { method: 'PATCH', body: details })
}

export function approveApplication(id: string): Promise<ApproveResult> {
  return api<ApproveResult>(`/applications/${id}/approve`, { method: 'PATCH' })
}

export function rejectApplication(id: string): Promise<JobApplication> {
  return api<JobApplication>(`/applications/${id}/reject`, { method: 'PATCH' })
}

// ── Duplicate-apply guard (localStorage, cookie-free) ─────────────────────
// Bump this when a new vacancy opens — candidates may then apply again.
export const CURRENT_VACANCY_ID = 'vac-2026-06'
const APPLIED_KEY = `manava_applied_${CURRENT_VACANCY_ID}`

export function hasApplied(): boolean {
  try {
    return localStorage.getItem(APPLIED_KEY) === '1'
  } catch {
    return false
  }
}

export function markApplied(): void {
  try {
    localStorage.setItem(APPLIED_KEY, '1')
  } catch {
    // Storage unavailable — guard simply won't persist.
  }
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'Baru', interview: 'Interview', approved: 'Diterima', rejected: 'Ditolak',
}
