import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAttendance,
  clockIn,
  clockOut,
  fetchAttendance,
  fetchAttendanceToday,
  fetchReviewQueue,
  fetchTeamAttendance,
  openAttendanceSession,
  rejectAttendance,
  submitExplanation,
  updateAttendanceSettings,
  type AttendanceListParams,
  type AttendanceSettings,
  type ApproveInput,
  type ExplanationInput,
  type OpenSessionInput,
} from '../../lib/attendance'

export const ATTENDANCE_KEY = ['attendance']

export function useAttendanceToday(enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'today'],
    queryFn: fetchAttendanceToday,
    enabled,
  })
}

export function useAttendanceRecords(params: AttendanceListParams = {}, enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'records', params],
    queryFn: () => fetchAttendance(params),
    enabled,
  })
}

// One query serves two audiences: for HR it is everyone's pending queue, for
// an editor / admin manager the API scopes it to their own records.
export function useAttendancePending(enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'records', { review: 'pending' }],
    queryFn: () => fetchAttendance({ review: 'pending' }),
    enabled,
  })
}

export function useTeamAttendance(enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'team'],
    queryFn: fetchTeamAttendance,
    enabled,
  })
}

export function useReviewQueue(enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'review-queue'],
    queryFn: fetchReviewQueue,
    enabled,
  })
}

// Every mutation invalidates the whole attendance namespace so the today
// card, calendar, queues, and header badge stay in sync.
export function useAttendanceMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ATTENDANCE_KEY })

  const doClockIn = useMutation({ mutationFn: (code: string) => clockIn(code), onSuccess: invalidate })
  const doClockOut = useMutation({ mutationFn: (code: string) => clockOut(code), onSuccess: invalidate })
  const explain = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExplanationInput }) => submitExplanation(id, input),
    onSuccess: invalidate,
  })
  const approve = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApproveInput }) => approveAttendance(id, input),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectAttendance(id, note),
    onSuccess: invalidate,
  })
  const saveSettings = useMutation({
    mutationFn: (input: AttendanceSettings) => updateAttendanceSettings(input),
    onSuccess: invalidate,
  })
  const openSession = useMutation({
    mutationFn: (input: OpenSessionInput) => openAttendanceSession(input),
    onSuccess: invalidate,
  })

  return { clockIn: doClockIn, clockOut: doClockOut, explain, approve, reject, saveSettings, openSession }
}
