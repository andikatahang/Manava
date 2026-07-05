// Attendance API client. Clock-in requires the rotating daily code; clock-out
// does not. A forgotten clock-out becomes status "incomplete" + review
// "pending" and must be decided by HR (approve → fill clock-out, reject →
// counted absent). Originals are immutable; HR repairs land in adjusted_*.

import { api } from './api'

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'partial' | 'leave' | 'incomplete'
export type AttendanceReview = 'none' | 'pending' | 'approved' | 'rejected'

export interface Attendance {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  clock_in: string | null // ISO datetime
  clock_out: string | null
  status: AttendanceStatus
  review: AttendanceReview
  adjusted_clock_out: string | null
  adjusted_at: string | null
  adjustment_note: string | null
  user_explanation: string | null
  proposed_clock_out: string | null
  user: { full_name: string; role: string }
  adjuster: { full_name: string } | null
}

export interface AttendanceSettings {
  clock_in_time: string // HH:MM WIB
  clock_out_time: string
  // Doubles as the lateness allowance: clock-in past clock_in_time is late,
  // clock_in_time + duration is the hard cutoff (no clock-in after it).
  code_duration_minutes: number
}

/** End of the clock-in window ("batas keterlambatan"), e.g. 08:00+15 → "08:15". */
export function clockInDeadline(s: AttendanceSettings): string {
  const [h, m] = s.clock_in_time.split(':').map(Number)
  const total = (h ?? 0) * 60 + (m ?? 0) + s.code_duration_minutes
  const clamped = Math.min(total, 23 * 60 + 59)
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export interface AttendanceToday {
  record: Attendance | null
  settings: AttendanceSettings
  code: string | null // only present for HR roles
  server_date: string
  me: string // caller's user id — for scoping shared lists client-side
}

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false,
})

/** ISO datetime → "HH:MM" WIB (the clock the whole app displays). */
export function fmtTimeWIB(iso: string | null | undefined): string {
  return iso ? timeFmt.format(new Date(iso)) : '—'
}

/** Effective clock-out: what the user recorded, else what HR filled in. */
export function effectiveClockOut(a: Attendance): string | null {
  return a.clock_out ?? a.adjusted_clock_out
}

function normalize(a: Attendance): Attendance {
  return { ...a, date: a.date.slice(0, 10) }
}

export async function fetchAttendanceToday(): Promise<AttendanceToday> {
  const data = await api<AttendanceToday>('/attendance/today')
  return { ...data, record: data.record ? normalize(data.record) : null }
}

export interface AttendanceListParams {
  month?: string // YYYY-MM
  user_id?: string
  review?: 'pending' | 'approved' | 'rejected'
}

export async function fetchAttendance(params: AttendanceListParams = {}): Promise<Attendance[]> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString()
  const rows = await api<Attendance[]>(`/attendance${qs ? `?${qs}` : ''}`)
  return rows.map(normalize)
}

export async function fetchReviewQueue(): Promise<Attendance[]> {
  const rows = await api<Attendance[]>('/attendance/review-queue')
  return rows.map(normalize)
}

export async function clockIn(code: string): Promise<Attendance> {
  return normalize(await api<Attendance>('/attendance/clock-in', { method: 'POST', body: { code } }))
}

export async function clockOut(): Promise<Attendance> {
  return normalize(await api<Attendance>('/attendance/clock-out', { method: 'POST' }))
}

export interface ExplanationInput {
  explanation: string
  proposed_clock_out?: string // HH:MM
}

export async function submitExplanation(id: string, input: ExplanationInput): Promise<Attendance> {
  return normalize(await api<Attendance>(`/attendance/${id}/explanation`, { method: 'PATCH', body: input }))
}

export interface ApproveInput {
  adjusted_clock_out: string // HH:MM, capped at the scheduled clock-out server-side
  note: string
}

export async function approveAttendance(id: string, input: ApproveInput): Promise<Attendance> {
  return normalize(await api<Attendance>(`/attendance/${id}/approve`, { method: 'PATCH', body: input }))
}

export async function rejectAttendance(id: string, note: string): Promise<Attendance> {
  return normalize(await api<Attendance>(`/attendance/${id}/reject`, { method: 'PATCH', body: { note } }))
}

export async function updateAttendanceSettings(input: AttendanceSettings): Promise<AttendanceSettings> {
  return api<AttendanceSettings>('/attendance/settings', { method: 'PATCH', body: input })
}

export async function regenerateAttendanceCode(): Promise<{ code: string }> {
  return api<{ code: string }>('/attendance/code/regenerate', { method: 'POST' })
}
