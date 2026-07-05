// Attendance API client. HR opens presensi sessions (masuk / keluar) with a
// duration ("Buka Presensi"); users clock in/out only while a session of that
// type is active, typing its code. A forgotten clock-out becomes status
// "incomplete" + review "pending" and must be decided by HR (approve → fill
// clock-out, reject → counted absent). Originals are immutable; HR repairs
// land in adjusted_*.

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
  clock_in_time: string // HH:MM WIB — lateness reference (masuk lewat jam ini = terlambat)
  clock_out_time: string // caps HR clock-out repairs
  code_duration_minutes: number // default duration offered in the Buka Presensi popup
}

export type AttendanceSessionType = 'masuk' | 'keluar'

// A presensi window opened by HR. The code is delivered to Admin Managers and
// Editors via the in-app notification; they type it back to clock in/out.
export interface AttendanceSession {
  id: string
  type: AttendanceSessionType
  code: string
  duration_minutes: number
  opened_at: string // ISO datetime
  expires_at: string
}

export interface AttendanceToday {
  record: Attendance | null
  settings: AttendanceSettings
  sessions: { masuk: AttendanceSession | null; keluar: AttendanceSession | null }
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

// One row per team member (one level below the caller) for the department
// presensi table: today's record + this month's history.
export interface TeamAttendanceMember {
  user_id: string
  full_name: string
  role: string
  avatar: string | null
  today: Attendance | null
  records: Attendance[]
}

export async function fetchTeamAttendance(): Promise<TeamAttendanceMember[]> {
  const rows = await api<TeamAttendanceMember[]>('/attendance/team')
  return rows.map(m => ({
    ...m,
    today: m.today ? normalize(m.today) : null,
    records: m.records.map(normalize),
  }))
}

export async function fetchReviewQueue(): Promise<Attendance[]> {
  const rows = await api<Attendance[]>('/attendance/review-queue')
  return rows.map(normalize)
}

export async function clockIn(code: string): Promise<Attendance> {
  return normalize(await api<Attendance>('/attendance/clock-in', { method: 'POST', body: { code } }))
}

export async function clockOut(code: string): Promise<Attendance> {
  return normalize(await api<Attendance>('/attendance/clock-out', { method: 'POST', body: { code } }))
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

export interface OpenSessionInput {
  type: AttendanceSessionType
  duration_minutes: number
}

/** HR "Buka Presensi" — opens a masuk/keluar window; replaces any open one. */
export async function openAttendanceSession(input: OpenSessionInput): Promise<AttendanceSession> {
  return api<AttendanceSession>('/attendance/sessions', { method: 'POST', body: input })
}
