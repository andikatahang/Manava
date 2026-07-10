// Leave-request API client. Editors and Admin Managers file leave; requests
// travel one level up the org chart for approval (Editor → Admin Manager,
// Admin Manager → HR Admin). Requester identity is taken from the JWT
// server-side — the client only sends the leave details.

import { api } from './api'
import type { LeaveRequest, UserRole } from '../types'

// Which requester roles each approver is responsible for. Shared by the
// attendance page (approval queue) and the header (notification badge).
export type RequesterRole = 'editor' | 'admin_manager'

export const APPROVES_REQUESTS_FROM: Partial<Record<UserRole, RequesterRole[]>> = {
  admin_manager: ['editor'],
  hr_admin: ['admin_manager'],
  superadmin: ['editor', 'admin_manager'],
}

// Human label for where a given requester's leave is sent.
export const ROUTES_TO_LABEL: Record<RequesterRole, string> = {
  editor: 'Admin Manager',
  admin_manager: 'HR Admin',
}

export const REQUESTER_ROLE_LABEL: Record<RequesterRole, string> = {
  editor: 'Staf',
  admin_manager: 'Admin Manager',
}

export interface SubmitLeaveInput {
  leave_type: 'cuti' | 'izin'
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  reason?: string    // optional context (max 500 chars)
}

export interface DecisionInput {
  decision_note?: string
}

// API dates arrive as ISO datetimes; the UI works with plain YYYY-MM-DD
// strings (calendar math + lexicographic range checks), so normalize here.
function normalize(r: LeaveRequest): LeaveRequest {
  return {
    ...r,
    start_date: r.start_date.slice(0, 10),
    end_date: r.end_date.slice(0, 10),
    created_at: r.created_at.slice(0, 10),
  }
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const rows = await api<LeaveRequest[]>('/leave-requests')
  return rows.map(normalize)
}

export async function submitLeaveRequest(input: SubmitLeaveInput): Promise<LeaveRequest> {
  return normalize(await api<LeaveRequest>('/leave-requests', { method: 'POST', body: input }))
}

export async function approveLeaveRequest(id: string, input?: DecisionInput): Promise<LeaveRequest> {
  return normalize(await api<LeaveRequest>(`/leave-requests/${id}/approve`, { method: 'PATCH', body: input }))
}

export async function rejectLeaveRequest(id: string, input?: DecisionInput): Promise<LeaveRequest> {
  return normalize(await api<LeaveRequest>(`/leave-requests/${id}/reject`, { method: 'PATCH', body: input }))
}

export async function changePassword(input: { current_password: string; new_password: string }): Promise<void> {
  await api<void>('/auth/password', { method: 'PATCH', body: input })
}
