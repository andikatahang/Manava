import { useMemo, useState } from 'react'
import {
  Calendar, CheckCircle2, XCircle, AlertTriangle, ChevronRight, Plus, ArrowRight, User, Clock,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { formatDate } from '../../lib/utils'
import type { UserRole, LeaveRequest } from '../../types'
// Leave data is DB-backed; the approval hierarchy maps are shared with the
// header notification badge. Requests travel one level up the org chart:
// Editor → Admin Manager → HR Admin.
import {
  APPROVES_REQUESTS_FROM,
  REQUESTER_ROLE_LABEL,
  ROUTES_TO_LABEL,
  type RequesterRole,
} from '../../lib/leaveRequests'
import { useLeaveRequests, useLeaveRequestMutations } from '../../hooks/queries/useLeaveRequests'
// Attendance is DB-backed too: HR-opened presensi sessions (masuk/keluar),
// clock-in/out with the session code, and the HR review flow for forgotten
// clock-outs live in AttendanceTab.
import { AttendanceTab } from './AttendanceTab'


// ── page ─────────────────────────────────────────────────────────────────────
type Tab = 'attendance' | 'leave'
type LeaveType = 'cuti' | 'izin'
type LeaveForm = { type: LeaveType; start: string; end: string; reason: string }

export default function AttendancePage({ role, forcedView }: { role: UserRole; embedded?: boolean; forcedView?: Tab }) {
  const [tab, setTab] = useState<Tab>(forcedView ?? 'attendance')
  const leaveQuery = useLeaveRequests()
  const leaves = useMemo(() => leaveQuery.data ?? [], [leaveQuery.data])
  const { submit, approve, reject } = useLeaveRequestMutations()
  const [leaveDetail, setLeaveDetail] = useState<LeaveRequest | null>(null)
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({ type: 'cuti', start: '', end: '', reason: '' })
  const [toast, setToast] = useState<string | null>(null)

  // Approval scope + submission rights derived from the hierarchy map.
  // Memoized so its identity is stable per role (keeps dependent useMemos honest).
  const approvableRoles = useMemo(() => APPROVES_REQUESTS_FROM[role] ?? [], [role])
  const canApproveLeave = approvableRoles.length > 0
  // Editors and Admin Managers file their own leave (each routed one level up).
  const canRequestLeave = role === 'editor' || role === 'admin_manager'
  const myRequesterRole: RequesterRole = role === 'admin_manager' ? 'admin_manager' : 'editor'

  // Requests this role should see: an approver's queue plus, for an Admin Manager,
  // their own submissions to HR Admin. Editors see only editor-filed requests.
  const visibleLeaves = useMemo(() => {
    if (role === 'hr_admin') return leaves.filter(l => l.requester_role === 'admin_manager')
    if (role === 'editor') return leaves.filter(l => l.requester_role === 'editor')
    return leaves // admin_manager / superadmin / finance see the full chain
  }, [role, leaves])

  // Badge/queue counts only what THIS role can actually action.
  const pendingLeaves = useMemo(
    () => leaves.filter(l => l.status === 'pending' && approvableRoles.includes(l.requester_role)),
    [leaves, approvableRoles],
  )

  // A request is actionable here only if it was filed by a role we approve for.
  const canActOnDetail = (l: LeaveRequest) =>
    l.status === 'pending' && approvableRoles.includes(l.requester_role)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }
  const [decisionNote, setDecisionNote] = useState('')

  function approveLeave(id: string) {
    approve.mutate(
      { id, input: decisionNote.trim() ? { decision_note: decisionNote.trim() } : undefined },
      {
        onSuccess: () => {
          setLeaveDetail(d => (d ? { ...d, status: 'approved' } : null))
          setDecisionNote('')
          flash('Permohonan disetujui.')
        },
        onError: e => flash(e instanceof Error ? e.message : 'Gagal menyetujui permohonan.'),
      },
    )
  }
  function rejectLeave(id: string) {
    reject.mutate(
      { id, input: decisionNote.trim() ? { decision_note: decisionNote.trim() } : undefined },
      {
        onSuccess: () => {
          setLeaveDetail(d => (d ? { ...d, status: 'rejected' } : null))
          setDecisionNote('')
          flash('Permohonan ditolak.')
        },
        onError: e => flash(e instanceof Error ? e.message : 'Gagal menolak permohonan.'),
      },
    )
  }
  function submitLeave() {
    if (!leaveForm.start || !leaveForm.end) return
    if (leaveForm.reason.length > 500) {
      flash('Alasan melebihi batas 500 karakter.')
      return
    }
    // Requester identity is derived server-side from the session; the request
    // is routed one level up automatically.
    submit.mutate(
      {
        leave_type: leaveForm.type,
        start_date: leaveForm.start,
        end_date: leaveForm.end,
        ...(leaveForm.reason.trim() ? { reason: leaveForm.reason.trim() } : {}),
      },
      {
        onSuccess: () => {
          setLeaveModal(false)
          setLeaveForm({ type: 'cuti', start: '', end: '', reason: '' })
          flash(`Permohonan cuti terkirim ke ${ROUTES_TO_LABEL[myRequesterRole]}.`)
        },
        onError: e => {
          // Handle 409 conflict for overlapping dates.
          const msg = e instanceof Error ? e.message : 'Gagal mengirim permohonan.'
          if (msg.toLowerCase().includes('overlap') || msg.toLowerCase().includes('conflict') || msg.includes('409')) {
            flash('Tanggal cuti bertumpang tindih dengan permohonan yang sudah ada.')
          } else {
            flash(msg)
          }
        },
      },
    )
  }


  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
        </div>
      )}

      {/* Tabs ─ kept to two; payroll lives in /payments. Hidden when a single
          view is forced by the host (e.g. the HR Dashboard splits these into
          its own top-level tabs). */}
      {!forcedView && (
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
          <TabBtn active={tab === 'attendance'} onClick={() => setTab('attendance')} label="Presensi" />
          <TabBtn
            active={tab === 'leave'} onClick={() => setTab('leave')} label="Permohonan Cuti"
            badge={canApproveLeave && pendingLeaves.length > 0 ? pendingLeaves.length : undefined}
          />
        </div>
      )}

      {tab === 'attendance' && <AttendanceTab role={role} leaves={leaves} flash={flash} />}

      {tab === 'leave' && (
        <LeaveView
          canApprove={canApproveLeave}
          canRequest={canRequestLeave}
          requesterRole={myRequesterRole}
          leaves={visibleLeaves}
          onOpenLeave={setLeaveDetail}
          onAjukan={() => setLeaveModal(true)}
        />
      )}

      {/* Leave detail drawer */}
      <Drawer
        open={!!leaveDetail}
        onClose={() => { setLeaveDetail(null); setDecisionNote('') }}
        title={leaveDetail?.requester_name ?? ''}
        subtitle={leaveDetail ? `${leaveDetail.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin / Sakit'} · ${formatDate(leaveDetail.start_date)} – ${formatDate(leaveDetail.end_date)}` : ''}
        footer={leaveDetail && canActOnDetail(leaveDetail) ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-navy/60 mb-1 block">Catatan keputusan (opsional)</label>
              <textarea
                value={decisionNote}
                onChange={e => setDecisionNote(e.target.value)}
                rows={2}
                className="input resize-none text-sm"
                placeholder="Alasan menyetujui atau menolak..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                onClick={() => rejectLeave(leaveDetail.leave_id)}
              >
                <XCircle className="w-4 h-4" /> Tolak
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                onClick={() => approveLeave(leaveDetail.leave_id)}
              >
                <CheckCircle2 className="w-4 h-4" /> Setujui
              </button>
            </div>
          </div>
        ) : undefined}
      >
        {leaveDetail && <LeaveDetailBody leave={leaveDetail} />}
      </Drawer>

      {/* Ajukan Cuti modal (form-only — short single-step form) */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Ajukan Cuti">
        <div className="space-y-4">
          <div>
            <label className="label">Jenis</label>
            <div className="grid grid-cols-2 gap-2">
              {([['cuti', 'Cuti Tahunan'], ['izin', 'Izin / Sakit']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setLeaveForm(f => ({ ...f, type: v }))}
                  className={`p-3 rounded-xl border text-left transition-all ${leaveForm.type === v ? 'border-navy bg-navy/5' : 'border-border'}`}
                >
                  <p className={`text-sm font-semibold ${leaveForm.type === v ? 'text-navy' : 'text-navy/60'}`}>{l}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mulai</label>
              <input type="date" value={leaveForm.start} onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Selesai</label>
              <input type="date" value={leaveForm.end} onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Alasan (opsional)</label>
            <textarea
              value={leaveForm.reason}
              onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value.slice(0, 500) }))}
              rows={3}
              maxLength={500}
              className="input resize-none"
              placeholder={`Cantumkan konteks untuk ${ROUTES_TO_LABEL[myRequesterRole]} Anda.`}
            />
            <p className={`text-xs mt-1 ${leaveForm.reason.length > 450 ? 'text-amber-600' : 'text-navy/40'}`}>
              {leaveForm.reason.length}/500 karakter
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setLeaveModal(false)} className="btn-secondary">Batal</button>
            <button
              disabled={!leaveForm.start || !leaveForm.end}
              onClick={submitLeave}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />Kirim
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Tabs button ──────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}
    >
      {label}
      {badge !== undefined && (
        <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-navy/40">{label}</p>
      <p className="text-xl font-bold text-navy leading-tight mt-0.5">{value}</p>
    </div>
  )
}

// ── Leave view ───────────────────────────────────────────────────────────────
type LeaveFilter = 'pending' | 'approved' | 'rejected' | 'all'

function LeaveView({
  canApprove, canRequest, requesterRole, leaves, onOpenLeave, onAjukan,
}: {
  canApprove: boolean
  canRequest: boolean
  requesterRole: RequesterRole
  leaves: LeaveRequest[]
  onOpenLeave: (l: LeaveRequest) => void
  onAjukan: () => void
}) {
  // Manager view defaults to focused "pending" queue; editor sees their own list flat.
  const [filter, setFilter] = useState<LeaveFilter>(canApprove ? 'pending' : 'all')
  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {([['pending','Menunggu'],['approved','Disetujui'],['rejected','Ditolak'],['all','Semua']] as const).map(([v, l]) => {
            const count = v === 'all' ? leaves.length : leaves.filter(x => x.status === v).length
            return (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${filter === v ? 'bg-navy text-white' : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e8e8e8]'}`}
              >
                {l} ({count})
              </button>
            )
          })}
        </div>
        {canRequest && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-navy/50">
              Disetujui oleh <span className="font-medium text-navy">{ROUTES_TO_LABEL[requesterRole]}</span>
            </span>
            <button className="btn-primary text-sm" onClick={onAjukan}>
              <Plus className="w-4 h-4" />Ajukan Cuti
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-navy/20" />
          <p className="text-sm text-navy/50">Tidak ada permohonan pada filter ini.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border bg-white border border-border rounded-2xl overflow-hidden">
          {filtered.map(l => (
            <li key={l.leave_id}>
              <button
                type="button"
                onClick={() => onOpenLeave(l)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-navy-50/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {l.requester_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{l.requester_name}</p>
                  <p className="text-xs text-navy/50">
                    {l.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin'} · {formatDate(l.start_date)} – {formatDate(l.end_date)}
                  </p>
                </div>
                <StatusBadge status={l.status} />
                <ChevronRight className="w-4 h-4 text-navy/30 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LeaveDetailBody({ leave }: { leave: LeaveRequest }) {
  const days = Math.round(
    (new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / 86400000,
  ) + 1
  // Project conflict warning — heuristic from mock: editor 'e1' has active project p1.
  const hasConflict = leave.requester_id === 'u2' && leave.status === 'pending'
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Mulai"   value={formatDate(leave.start_date)} />
        <Stat label="Selesai" value={formatDate(leave.end_date)} />
        <Stat label="Durasi"  value={`${days} hari`} />
        <Stat label="Jenis"   value={leave.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin'} />
      </div>

      {leave.reason && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Alasan pengajuan</p>
          <p className="text-sm text-navy bg-navy/5 rounded-xl px-3 py-2.5 border border-navy/10">{leave.reason}</p>
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Alur persetujuan</p>
        <div className="flex items-center gap-2 rounded-xl border border-navy/10 bg-navy/5 px-3 py-2.5 text-xs">
          <span className="font-semibold text-navy">{REQUESTER_ROLE_LABEL[leave.requester_role]}</span>
          <ArrowRight className="w-3.5 h-3.5 text-navy/40 shrink-0" />
          <span className="text-navy/60">Persetujuan <span className="font-medium text-navy">{ROUTES_TO_LABEL[leave.requester_role]}</span></span>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Diajukan</p>
        <p className="text-sm text-navy">{formatDate(leave.created_at)}</p>
      </div>

      {hasConflict && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900">
            <p className="font-semibold mb-1">Konflik dengan proyek aktif</p>
            <p className="text-amber-800">
              Editor memiliki 1 proyek <span className="font-medium">IN_PROGRESS</span>. Persetujuan akan memicu pembatalan proyek + refund 80% DP (per PRD).
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Status saat ini</p>
        <StatusBadge status={leave.status} />
      </div>

      {/* Audit trail: decision info for approved/rejected requests */}
      {leave.status !== 'pending' && leave.decided_by_name && (
        <div className={`rounded-xl border p-4 ${leave.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <User className={`w-4 h-4 ${leave.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`} />
            <p className={`text-sm font-semibold ${leave.status === 'approved' ? 'text-emerald-900' : 'text-red-900'}`}>
              {leave.status === 'approved' ? 'Disetujui' : 'Ditolak'} oleh {leave.decided_by_name}
            </p>
          </div>
          {leave.decided_at && (
            <p className={`text-xs flex items-center gap-1.5 ${leave.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
              <Clock className="w-3.5 h-3.5" />
              {formatDate(leave.decided_at)}
            </p>
          )}
          {leave.decision_note && (
            <p className={`text-xs mt-2 italic ${leave.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
              "{leave.decision_note}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
