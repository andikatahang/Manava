// Job-application API client. Candidates submit from the public /apply page;
// HR admin reviews via /recruitment. No client-side re-apply guard (demo needs
// repeated submissions); the server still rejects a second ACTIVE application
// for the same email.

import { api, apiBlob } from './api'
import type { JobPosting } from '../types'

export type ApplicationStatus = 'new' | 'interview' | 'approved' | 'rejected'

// Profile fields are AI-extracted from the CV (nullable — a CV may not
// state them); the applicant only types name/email/phone.
// Slim job info embedded in application list/detail responses.
export interface ApplicationJobInfo {
  job_id: string
  title: string
  department: string | null
  position: string | null
  work_type: WorkType | null
  work_system: WorkSystem | null
}

export interface JobApplication {
  application_id: string
  job_id: string | null
  job: ApplicationJobInfo | null
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
  job_id?: string
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

export function fetchVacancyCriteria(jobId?: string): Promise<VacancyCriterion[]> {
  const suffix = jobId ? `?job_id=${encodeURIComponent(jobId)}` : ''
  return api<VacancyCriterion[]>(`/applications/criteria${suffix}`)
}

// ── Recruitment on/off switch ─────────────────────────────────────────────

export interface RecruitmentSetting {
  id: string
  is_open: boolean
  updated_at: string
}

export function fetchRecruitmentStatus(): Promise<RecruitmentSetting> {
  return api<RecruitmentSetting>('/applications/recruitment-status')
}

export function updateRecruitmentStatus(is_open: boolean): Promise<RecruitmentSetting> {
  return api<RecruitmentSetting>('/applications/recruitment-status', { method: 'PATCH', body: { is_open } })
}

// ── Job postings ───────────────────────────────────────────────────────────

export type WorkType = 'fulltime' | 'parttime'
export type WorkSystem = 'remote' | 'hybrid' | 'onsite'

export interface JobPostingInput {
  title: string
  department?: string | null
  position?: string | null
  work_type?: WorkType | null
  work_system?: WorkSystem | null
  description?: string | null
  min_gpa?: number | null
  min_education?: string | null
  required_skills?: string[]
  required_experience?: string | null
  specialization: string[]
  status?: 'open' | 'closed'
}

// HR view — every posting including the closed ones.
export function fetchJobPostings(): Promise<JobPosting[]> {
  return api<JobPosting[]>('/job-postings?include_closed=true')
}

// Public /apply view — open postings only (server default).
export function fetchOpenJobPostings(): Promise<JobPosting[]> {
  return api<JobPosting[]>('/job-postings')
}

export function createJobPosting(input: JobPostingInput): Promise<JobPosting> {
  return api<JobPosting>('/job-postings', { method: 'POST', body: input })
}

export function updateJobPosting(id: string, input: Partial<JobPostingInput>): Promise<JobPosting> {
  return api<JobPosting>(`/job-postings/${id}`, { method: 'PATCH', body: input })
}

export function updateJobPostingStatus(id: string, status: 'open' | 'closed'): Promise<JobPosting> {
  return api<JobPosting>(`/job-postings/${id}/status`, { method: 'PATCH', body: { status } })
}

export function deleteJobPosting(id: string): Promise<{ deleted: string }> {
  return api<{ deleted: string }>(`/job-postings/${id}`, { method: 'DELETE' })
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
  // Send outlived the API's wait budget and continues server-side — not a
  // failure, so the UI shows an "in progress" notice instead of an error.
  pending?: boolean
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

export interface RejectResult {
  application: JobApplication
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

// interviewer is not sent by the client — the server locks it to whichever
// HR admin is authenticated when the shortlist request is made.
export interface InterviewDetails {
  mode: 'online' | 'offline'
  location?: string
}

export function shortlistApplication(id: string, details: InterviewDetails): Promise<ShortlistResult> {
  return api<ShortlistResult>(`/applications/${id}/shortlist`, { method: 'PATCH', body: details })
}

// `department` is HR's placement choice from the approval popup; omitted =
// server falls back to the AI recommendation from the CV screening.
export function approveApplication(id: string, department?: string): Promise<ApproveResult> {
  return api<ApproveResult>(`/applications/${id}/approve`, {
    method: 'PATCH',
    body: department ? { department } : {},
  })
}

// Rejection also sends a templated notification email to the candidate.
export function rejectApplication(id: string): Promise<RejectResult> {
  return api<RejectResult>(`/applications/${id}/reject`, { method: 'PATCH' })
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'Baru', interview: 'Interview', approved: 'Diterima', rejected: 'Ditolak',
}
