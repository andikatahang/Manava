// Job-application API client. Candidates submit from the public /apply page;
// HR admin reviews via /recruitment. A localStorage flag guards against the
// same browser re-submitting the current vacancy (the server also rejects a
// second active application for the same email).

import { api, apiBlob } from './api'

export type ApplicationStatus = 'new' | 'interview' | 'approved' | 'rejected'

export interface JobApplication {
  application_id: string
  full_name: string
  email: string
  age: number
  phone: string
  education: string
  gpa: number
  graduation_year: number
  skills: string[]
  cv_name: string
  cv_mime: string
  ai_summary: string
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
  age: number
  phone: string
  education: string
  gpa: number
  graduation_year: number
  skills: string[]
  cv_name: string
  cv_data: string // data URL (PDF/DOC, max 5MB)
}

// Editor account auto-created when HR approves a candidate.
export interface CreatedAccount {
  user_id: string
  username: string
  email: string
  temp_password: string
}

export interface ApproveResult {
  application: JobApplication
  account: CreatedAccount
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

export function shortlistApplication(id: string, details: InterviewDetails): Promise<JobApplication> {
  return api<JobApplication>(`/applications/${id}/shortlist`, { method: 'PATCH', body: details })
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

export const SKILL_OPTIONS = [
  'Product Retouch', 'Color Correction', 'Portrait Retouch', 'BG Removal',
  'Video Edit', 'Color Grading', 'Motion Graphics', 'VFX',
]

export const EDUCATION_OPTIONS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3']

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'Baru', interview: 'Interview', approved: 'Diterima', rejected: 'Ditolak',
}
