// Merged "Presensi" tab of the department dashboards. One minimalist table of
// team members (one level below the viewer) with today's attendance, inline
// approve/reject for their leave requests, and a drawer with the member's
// month history. HR additionally keeps the presensi session controls and the
// forgotten-clock-out review queue here.
//   admin_manager → editors of their departments
//   hr_admin / superadmin → Admin Managers only

import { useMemo, useState } from 'react'
import { CheckCircle2, KeyRound, Settings2, Users, XCircle } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import type { UserRole } from '../../types'
import {
  effectiveClockOut, fmtTimeWIB,
  type Attendance, type AttendanceStatus, type TeamAttendanceMember,
} from '../../lib/attendance'
import {
  useAttendanceMutations, useAttendanceToday, useReviewQueue, useTeamAttendance,
} from '../../hooks/queries/useAttendance'
import { useLeaveRequests, useLeaveRequestMutations } from '../../hooks/queries/useLeaveRequests'
import { APPROVES_REQUESTS_FROM } from '../../lib/leaveRequests'
import type { LeaveRequest } from '../../types'
import {
  ActiveSessionPanel, OpenPresensiModal, ReviewDrawer, ReviewQueueCard,
  SESSION_LABEL, SettingsModal, STATUS_LABEL, STATUS_STYLE,
} from './AttendanceTab'

const HR_ROLES: readonly UserRole[] = ['hr_admin', 'superadmin']

function fmtShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}
function fmtTableDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}
const onApprovedLeave = (leaves: LeaveRequest[], userId: string, date: string) =>
  leaves.some(l => l.requester_id === userId && l.status === 'approved'
    && l.start_date <= date && date <= l.end_date)

export function TeamPresensiTab({ role }: { role: UserRole }) {
  const isHR = HR_ROLES.includes(role)
  const teamQuery = useTeamAttendance()
  const members = teamQuery.data ?? []

  // Leave requests this viewer can decide (one level below, same as the table).
  const approvableRoles = useMemo(() => APPROVES_REQUESTS_FROM[role] ?? [], [role])
  const leaveQuery = useLeaveRequests()
  const { approve, reject } = useLeaveRequestMutations()
  const teamLeaves = useMemo(() => {
    const ids = new Set(members.map(m => m.user_id))
    return (leaveQuery.data ?? []).filter(
      l => approvableRoles.includes(l.requester_role) && ids.has(l.requester_id),
    )
  }, [leaveQuery.data, approvableRoles, members])

  const [detail, setDetail] = useState<TeamAttendanceMember | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }
  function decideLeave(l: LeaveRequest, decision: 'approve' | 'reject') {
    const mutation = decision === 'approve' ? approve : reject
    mutation.mutate(l.leave_id, {
      onSuccess: () => flash(decision === 'approve' ? 'Permohonan cuti disetujui.' : 'Permohonan cuti ditolak.'),
      onError: e => flash(e instanceof Error ? e.message : 'Gagal memproses permohonan.'),
    })
  }

  // HR keeps the session controls + review queue in this tab.
  const todayQuery = useAttendanceToday(isHR)
  const settings = todayQuery.data?.settings
  const sessions = todayQuery.data?.sessions
  const queueQuery = useReviewQueue(isHR)
  const mutations = useAttendanceMutations()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openPresensiOpen, setOpenPresensiOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<Attendance | null>(null)

  return (
    <div className="space-y-6 max-w-[1140px]">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
        </div>
      )}

      {isHR && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="w-4 h-4" /> Atur Jadwal
          </button>
          <button className="btn-primary text-sm" onClick={() => setOpenPresensiOpen(true)}>
            <KeyRound className="w-4 h-4" /> Buka Presensi
          </button>
        </div>
      )}

      {isHR && (sessions?.masuk || sessions?.keluar) && <ActiveSessionPanel sessions={sessions!} />}

      {teamQuery.isLoading && <p className="text-sm text-navy/50">Memuat presensi tim…</p>}
      {teamQuery.isError && (
        <p className="text-sm text-red-600">
          Gagal memuat presensi — pastikan backend berjalan. ({(teamQuery.error as Error).message})
        </p>
      )}
      {!teamQuery.isLoading && !teamQuery.isError && (
        <MemberTable
          members={members}
          leaves={teamLeaves}
          isHR={isHR}
          isDeciding={approve.isPending || reject.isPending}
          onOpen={setDetail}
          onDecide={decideLeave}
        />
      )}

      {isHR && <ReviewQueueCard queue={queueQuery.data ?? []} onOpen={setReviewTarget} />}

      {/* Member month history */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.full_name ?? ''}
        subtitle="Detail presensi bulan ini"
      >
        {detail && <MemberDetailBody member={detail} />}
      </Drawer>

      {isHR && (
        <ReviewDrawer
          record={reviewTarget}
          settings={settings}
          onClose={() => setReviewTarget(null)}
          onApprove={(id, time, note) =>
            mutations.approve.mutate(
              { id, input: { adjusted_clock_out: time, note } },
              {
                onSuccess: () => { setReviewTarget(null); flash('Presensi disetujui — jam pulang diisi.') },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal menyetujui.'),
              },
            )
          }
          onReject={(id, note) =>
            mutations.reject.mutate(
              { id, note },
              {
                onSuccess: () => { setReviewTarget(null); flash('Presensi ditolak — dihitung absen.') },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal menolak.'),
              },
            )
          }
          isPending={mutations.approve.isPending || mutations.reject.isPending}
        />
      )}

      {isHR && settings && (
        <OpenPresensiModal
          open={openPresensiOpen}
          defaultDuration={settings.code_duration_minutes}
          onClose={() => setOpenPresensiOpen(false)}
          onSubmit={(type, duration) =>
            mutations.openSession.mutate(
              { type, duration_minutes: duration },
              {
                onSuccess: s => {
                  setOpenPresensiOpen(false)
                  flash(`${SESSION_LABEL[s.type]} dibuka — kode ${s.code} berlaku s.d. ${fmtTimeWIB(s.expires_at)} WIB.`)
                },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal membuka presensi.'),
              },
            )
          }
          isPending={mutations.openSession.isPending}
        />
      )}

      {isHR && settings && (
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={input =>
            mutations.saveSettings.mutate(input, {
              onSuccess: () => { setSettingsOpen(false); flash('Jadwal presensi diperbarui.') },
              onError: e => flash(e instanceof Error ? e.message : 'Gagal menyimpan jadwal.'),
            })
          }
          isPending={mutations.saveSettings.isPending}
        />
      )}
    </div>
  )
}

// ── One-table view: member · today's presensi · leave decision ───────────────

function MemberTable({ members, leaves, isHR, isDeciding, onOpen, onDecide }: {
  members: TeamAttendanceMember[]
  leaves: LeaveRequest[]
  isHR: boolean
  isDeciding: boolean
  onOpen: (m: TeamAttendanceMember) => void
  onDecide: (l: LeaveRequest, decision: 'approve' | 'reject') => void
}) {
  const today = todayKey()
  const pendingByUser = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>()
    for (const l of leaves) {
      if (l.status !== 'pending') continue
      map.set(l.requester_id, [...(map.get(l.requester_id) ?? []), l])
    }
    return map
  }, [leaves])

  return (
    <section className="rounded-[12px] border border-black/[0.06] bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-black/[0.06]">
        <h3 className="font-semibold text-navy">
          {isHR ? 'Presensi Admin Manajer' : 'Presensi Anggota Departemen'}
        </h3>
        <p className="text-xs text-navy/50 mt-0.5">
          Kehadiran hari ini &amp; permohonan cuti — klik baris untuk riwayat bulan ini.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] font-semibold uppercase tracking-wider text-navy/40">
              <th className="px-5 py-3 font-semibold">Anggota</th>
              <th className="px-3 py-3 font-semibold">Jam Masuk</th>
              <th className="px-3 py-3 font-semibold">Jam Keluar</th>
              <th className="px-3 py-3 font-semibold">Status Hari Ini</th>
              <th className="px-5 py-3 font-semibold">Permohonan Cuti</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-navy/40">
                  {isHR ? 'Belum ada Admin Manajer aktif.' : 'Belum ada anggota di departemen Anda.'}
                </td>
              </tr>
            )}
            {members.map((m, i) => {
              const rec = m.today
              const out = rec ? effectiveClockOut(rec) : null
              const pending = pendingByUser.get(m.user_id) ?? []
              return (
                <tr
                  key={m.user_id}
                  onClick={() => onOpen(m)}
                  className={`cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-navy/[0.04] ${i % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'}`}
                >
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar name={m.full_name} avatar={m.avatar} />
                      <span className="text-sm font-medium text-navy truncate">{m.full_name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-navy tabular-nums whitespace-nowrap">
                    {rec ? fmtTimeWIB(rec.clock_in) : '—'}
                  </td>
                  <td className="px-3 py-3 text-navy tabular-nums whitespace-nowrap">
                    {out ? `${fmtTimeWIB(out)}${rec && !rec.clock_out ? '*' : ''}` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <TodayStatus status={rec?.status} onLeave={onApprovedLeave(leaves, m.user_id, today)} />
                  </td>
                  <td className="px-5 py-3">
                    {pending.length === 0 ? (
                      <span className="text-navy/30">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        {pending.map(l => (
                          <LeaveDecisionRow key={l.leave_id} leave={l} disabled={isDeciding} onDecide={onDecide} />
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TodayStatus({ status, onLeave }: { status?: AttendanceStatus; onLeave: boolean }) {
  if (!status && onLeave) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE.leave}`}>
        {STATUS_LABEL.leave}
      </span>
    )
  }
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-white text-navy/40">
        Belum Presensi
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function LeaveDecisionRow({ leave, disabled, onDecide }: {
  leave: LeaveRequest
  disabled: boolean
  onDecide: (l: LeaveRequest, decision: 'approve' | 'reject') => void
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-xs text-navy">
        <span className="font-medium">{leave.leave_type === 'cuti' ? 'Cuti' : 'Izin'}</span>
        <span className="text-navy/50"> · {fmtShortDate(leave.start_date)} – {fmtShortDate(leave.end_date)}</span>
      </span>
      <button
        disabled={disabled}
        onClick={e => { e.stopPropagation(); onDecide(leave, 'approve') }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors disabled:opacity-40"
      >
        <CheckCircle2 className="w-3 h-3" /> Setujui
      </button>
      <button
        disabled={disabled}
        onClick={e => { e.stopPropagation(); onDecide(leave, 'reject') }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded-full transition-colors disabled:opacity-40"
      >
        <XCircle className="w-3 h-3" /> Tolak
      </button>
    </div>
  )
}

// ── Drawer: member's month history ───────────────────────────────────────────

function MemberDetailBody({ member }: { member: TeamAttendanceMember }) {
  const count = (s: AttendanceStatus) => member.records.filter(r => r.status === s).length
  const cells: Array<[string, number, string]> = [
    ['Hadir', count('present'), 'text-emerald-600'],
    ['Terlambat', count('late'), 'text-amber-600'],
    ['Tinjauan', count('incomplete'), 'text-orange-600'],
    ['Absen', count('absent'), 'text-red-600'],
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {cells.map(([label, n, color]) => (
          <div key={label} className="bg-white border border-border rounded-xl px-3 py-2.5 text-center">
            <p className={`text-lg font-bold leading-tight ${color}`}>{n}</p>
            <p className="text-[10px] uppercase tracking-wider text-navy/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {member.records.length === 0 ? (
        <p className="text-sm text-navy/40 text-center py-8 flex items-center justify-center gap-2">
          <Users className="w-4 h-4" /> Belum ada catatan presensi bulan ini.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {member.records.map(r => {
            const out = effectiveClockOut(r)
            return (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-white">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy">{fmtTableDate(r.date)}</p>
                  <p className="text-xs text-navy/50 tabular-nums">
                    {fmtTimeWIB(r.clock_in)} → {out ? `${fmtTimeWIB(out)}${!r.clock_out ? '*' : ''}` : '—'}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-[11px] text-navy/40">* jam pulang diisi HR saat tinjauan.</p>
    </div>
  )
}

function MemberAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) return <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  return (
    <span className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-[11px] font-semibold text-navy shrink-0">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </span>
  )
}
