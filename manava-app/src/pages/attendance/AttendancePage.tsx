import { useMemo, useState } from 'react'
import {
  Clock, Calendar, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  CalendarDays, Lock, ChevronRight, Plus, ArrowRight,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { formatDate } from '../../lib/utils'
import { mockAttendance, mockEditors, mockAdminManagers } from '../../data/mockData'

// Mock attendance is implicitly one editor's record. Use the first active editor
// as the "subject" so manager / HR drawer headers identify whose day is being viewed.
const SUBJECT_EDITOR = mockEditors[0]
import type { UserRole, AttendanceRecord, LeaveRequest, TeamMember } from '../../types'
import { PageHeader } from '../../components/page/PageHeader'
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

// ── constants ────────────────────────────────────────────────────────────────
const CAL_YEAR = 2026
const CAL_MONTH = 6
const TODAY = '2026-06-26'
const DAYS_IN_MONTH = new Date(CAL_YEAR, CAL_MONTH, 0).getDate()
const FIRST_DOW = new Date(CAL_YEAR, CAL_MONTH - 1, 1).getDay()
const WEEK_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const STATUS_STYLE: Record<AttendanceRecord['status'], string> = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent:  'bg-red-100   text-red-700   border-red-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  leave:   'bg-blue-100  text-blue-700  border-blue-200',
}
const STATUS_LABEL: Record<AttendanceRecord['status'], string> = {
  present: 'Hadir', absent: 'Absen', partial: 'Sebagian', leave: 'Cuti',
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin:    { eyebrow: 'Operasi HR', title: 'Presensi & Cuti', description: 'Pantau siklus kehadiran dan permohonan cuti lintas departemen.' },
  hr_admin:      { eyebrow: 'Cutoff bulanan', title: 'Presensi & Cuti', description: 'Awasi rekap kehadiran dan setujui permohonan cuti dari Admin Manager sebelum lock cutoff bulanan.' },
  admin_manager: { eyebrow: 'Operasi tim', title: 'Presensi Tim', description: 'Setujui cuti editor departemen Anda, dan ajukan cuti Anda sendiri ke HR Admin.' },
  editor:        { eyebrow: 'Layanan mandiri', title: 'Presensi Saya', description: 'Catat clock-in/out hari ini dan kelola permohonan cuti Anda.' },
  client:        { eyebrow: 'Operasi', title: 'Presensi', description: '' },
  mediator:      { eyebrow: 'Operasi', title: 'Presensi', description: '' },
  finance:       { eyebrow: 'Operasi HR', title: 'Presensi & Cuti', description: 'Lihat rekap kehadiran sebagai input rekonsiliasi payroll.' },
}

// Today date is fixed for mock data — clock-out missing flag uses 17:30 cutoff per PRD.
const recordMap: Record<string, AttendanceRecord> = Object.fromEntries(
  mockAttendance.map(a => [a.date, a]),
)

function isWeekend(day: number) {
  return [0, 6].includes(new Date(CAL_YEAR, CAL_MONTH - 1, day).getDay())
}
function dayDate(day: number) {
  return `${CAL_YEAR}-0${CAL_MONTH}-${String(day).padStart(2, '0')}`
}
function fmtFullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── page ─────────────────────────────────────────────────────────────────────
type Tab = 'attendance' | 'leave'
type LeaveType = 'cuti' | 'izin'
type LeaveForm = { type: LeaveType; start: string; end: string; reason: string }

export default function AttendancePage({ role, embedded = false, forcedView }: { role: UserRole; embedded?: boolean; forcedView?: Tab }) {
  const [tab, setTab] = useState<Tab>(forcedView ?? 'attendance')
  const leaveQuery = useLeaveRequests()
  const leaves = useMemo(() => leaveQuery.data ?? [], [leaveQuery.data])
  const { submit, approve, reject } = useLeaveRequestMutations()
  const [dayDetail, setDayDetail] = useState<string | null>(null)
  const [leaveDetail, setLeaveDetail] = useState<LeaveRequest | null>(null)
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({ type: 'cuti', start: '', end: '', reason: '' })
  const [toast, setToast] = useState<string | null>(null)

  const isManager = role === 'admin_manager' || role === 'hr_admin' || role === 'superadmin'
  const canLock = role === 'hr_admin'
  const isEditor = role === 'editor'

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
  const needsClarification = useMemo(
    () => mockAttendance.filter(a => a.clock_in && !a.clock_out && a.date.startsWith('2026-06')),
    [],
  )

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }
  function approveLeave(id: string) {
    approve.mutate(id, {
      onSuccess: () => {
        setLeaveDetail(d => (d ? { ...d, status: 'approved' } : null))
        flash('Permohonan disetujui.')
      },
      onError: e => flash(e instanceof Error ? e.message : 'Gagal menyetujui permohonan.'),
    })
  }
  function rejectLeave(id: string) {
    reject.mutate(id, {
      onSuccess: () => {
        setLeaveDetail(d => (d ? { ...d, status: 'rejected' } : null))
        flash('Permohonan ditolak.')
      },
      onError: e => flash(e instanceof Error ? e.message : 'Gagal menolak permohonan.'),
    })
  }
  function submitLeave() {
    if (!leaveForm.start || !leaveForm.end) return
    // Requester identity is derived server-side from the session; the request
    // is routed one level up automatically.
    submit.mutate(
      { leave_type: leaveForm.type, start_date: leaveForm.start, end_date: leaveForm.end },
      {
        onSuccess: () => {
          setLeaveModal(false)
          setLeaveForm({ type: 'cuti', start: '', end: '', reason: '' })
          flash(`Permohonan cuti terkirim ke ${ROUTES_TO_LABEL[myRequesterRole]}.`)
        },
        onError: e => flash(e instanceof Error ? e.message : 'Gagal mengirim permohonan.'),
      },
    )
  }

  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.editor
  const detailRecord = dayDetail ? recordMap[dayDetail] : null

  return (
    <div className="space-y-6">
      {!embedded && <PageHeader eyebrow={h.eyebrow} title={h.title} description={h.description} role={role} />}

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

      {tab === 'attendance' && (
        <AttendanceView
          role={role}
          isEditor={isEditor}
          isManager={isManager}
          canLock={canLock}
          needsClarification={needsClarification}
          leaves={leaves}
          onOpenDay={setDayDetail}
          onLockMonth={() => flash('Rekap Juni 2026 berhasil dikunci.')}
        />
      )}

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

      {/* Day detail drawer */}
      <Drawer
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        title={role === 'editor' || !dayDetail ? (dayDetail ? fmtFullDate(dayDetail) : '') : SUBJECT_EDITOR.full_name}
        subtitle={
          role === 'editor'
            ? (detailRecord ? STATUS_LABEL[detailRecord.status] : 'Tidak ada catatan')
            : dayDetail ? `${fmtFullDate(dayDetail)} · ${detailRecord ? STATUS_LABEL[detailRecord.status] : 'Tidak ada catatan'}` : ''
        }
      >
        <DayDetailBody
          record={detailRecord}
          subject={role === 'editor' ? null : SUBJECT_EDITOR}
          canClarify={role === 'admin_manager'}
          onClarify={k => flash(`Status diubah ke ${STATUS_LABEL[k]}.`)}
        />
      </Drawer>

      {/* Leave detail drawer */}
      <Drawer
        open={!!leaveDetail}
        onClose={() => setLeaveDetail(null)}
        title={leaveDetail?.requester_name ?? ''}
        subtitle={leaveDetail ? `${leaveDetail.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin / Sakit'} · ${formatDate(leaveDetail.start_date)} – ${formatDate(leaveDetail.end_date)}` : ''}
        footer={leaveDetail && canActOnDetail(leaveDetail) ? (
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
              onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
              className="input resize-none"
              placeholder={`Cantumkan konteks untuk ${ROUTES_TO_LABEL[myRequesterRole]} Anda.`}
            />
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

// ── Attendance view ──────────────────────────────────────────────────────────
function AttendanceView({
  role, isEditor, isManager, canLock, needsClarification, leaves, onOpenDay, onLockMonth,
}: {
  role: UserRole
  isEditor: boolean
  isManager: boolean
  canLock: boolean
  needsClarification: AttendanceRecord[]
  leaves: LeaveRequest[]
  onOpenDay: (date: string) => void
  onLockMonth: () => void
}) {
  const todayRec = recordMap[TODAY]

  // EDITOR primary affordance: clock in/out. Other roles: managerial signal cards.
  return (
    <div className="space-y-6">
      {isEditor && <EditorTodayCard record={todayRec} onOpen={() => onOpenDay(TODAY)} />}

      {role === 'admin_manager' && (
        <SignalCard
          icon={AlertTriangle}
          tone="amber"
          title={`${needsClarification.length} hari perlu klarifikasi`}
          body="Editor di departemen Anda lupa clock-out. Klarifikasi sebelum cutoff bulanan."
          action={needsClarification.length > 0 ? { label: 'Lihat daftar', onClick: () => onOpenDay(needsClarification[0]!.date) } : undefined}
        />
      )}

      {canLock && (
        <SignalCard
          icon={Lock}
          tone="navy"
          title="Cutoff bulanan: 30 Jun 2026 · 18:00 WIB"
          body="Setelah dikunci, tidak ada klarifikasi missing clock-out yang bisa masuk. Pastikan Admin Manager menyelesaikan klarifikasi terlebih dahulu."
          action={{ label: 'Kunci Rekap Juni', onClick: onLockMonth }}
        />
      )}

      {/* Compact stats row — labels short, drill-in via calendar. */}
      <StatStrip />

      {/* Calendar — primary surface. Click → drawer. */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy">Juni 2026</h3>
            <p className="text-xs text-navy/50 mt-0.5">Klik tanggal untuk lihat detail.</p>
          </div>
          {isManager && (
            <span className="text-xs text-navy/40">Lihat sebagai: <span className="font-medium text-navy">Tim</span></span>
          )}
        </div>
        <CalendarGrid onOpenDay={onOpenDay} />
        <LegendRow />
      </div>

      {/* Team roster — single column: who is in today + who filed leave. */}
      {isManager && <TeamRoster role={role} leaves={leaves} />}
    </div>
  )
}

// ── Team roster (manager view) ─────────────────────────────────────────────────
// Single-column snapshot for managers: who is present today (with clock-in) and
// who has filed leave. The roster is scoped to the viewer's supervisory level —
// HR Admin sees Admin Managers across departments; an Admin Manager sees the
// editors in their team. Clock-in times are a deterministic mock (no per-person
// attendance feed yet); present members are the roster minus anyone on leave today.
const MOCK_CLOCK_INS = ['08:00', '08:05', '07:58', '08:12', '08:03']

function TeamRoster({ role, leaves }: { role: UserRole; leaves: LeaveRequest[] }) {
  // HR Admin oversees managers; everyone else at this level oversees editors.
  const seesManagers = role === 'hr_admin'
  const requesterScope: RequesterRole = seesManagers ? 'admin_manager' : 'editor'
  const roster: TeamMember[] = seesManagers
    ? mockAdminManagers
    : mockEditors
        .filter(e => e.status === 'active')
        .map(e => ({ id: e.editor_id, full_name: e.full_name, department: e.department, avatar: e.avatar }))

  const onLeaveToday = (name: string) =>
    leaves.some(l =>
      l.requester_name === name && l.requester_role === requesterScope &&
      l.status !== 'rejected' && l.start_date <= TODAY && TODAY <= l.end_date,
    )
  const present = roster.filter(m => !onLeaveToday(m.full_name))
  const leaveRequests = leaves
    .filter(l => l.requester_role === requesterScope)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const presentSubtitle = seesManagers ? 'Admin Manager per departemen' : fmtFullDate(TODAY)
  const leaveSubtitle = seesManagers
    ? 'Admin Manager yang mengajukan cuti / izin.'
    : 'Anggota tim yang mengajukan cuti / izin.'

  return (
    <div className="space-y-6">
      {/* Hadir hari ini */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy">Hadir Hari Ini</h3>
            <p className="text-xs text-navy/50 mt-0.5">{presentSubtitle}</p>
          </div>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
            {present.length} hadir
          </span>
        </div>
        {present.length === 0 ? (
          <p className="text-sm text-navy/50 py-6 text-center">Belum ada yang clock-in hari ini.</p>
        ) : (
          <ul className="divide-y divide-border">
            {present.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <RosterAvatar name={m.full_name} avatar={m.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{m.full_name}</p>
                  <p className="text-xs text-navy/50 truncate">{m.department}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] uppercase tracking-wider text-navy/40">Masuk</p>
                  <p className="text-sm font-bold text-navy tabular-nums flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {MOCK_CLOCK_INS[i % MOCK_CLOCK_INS.length]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pengajuan cuti */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy">Pengajuan Cuti</h3>
            <p className="text-xs text-navy/50 mt-0.5">{leaveSubtitle}</p>
          </div>
          <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
            {leaveRequests.length} pengajuan
          </span>
        </div>
        {leaveRequests.length === 0 ? (
          <p className="text-sm text-navy/50 py-6 text-center">Belum ada pengajuan cuti.</p>
        ) : (
          <ul className="divide-y divide-border">
            {leaveRequests.map(l => (
              <li key={l.leave_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <RosterAvatar name={l.requester_name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{l.requester_name}</p>
                  <p className="text-xs text-navy/50 truncate">
                    {l.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin / Sakit'} · {formatDate(l.start_date)} – {formatDate(l.end_date)}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RosterAvatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) return <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  return (
    <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}

function EditorTodayCard({ record, onOpen }: { record: AttendanceRecord | undefined; onOpen: () => void }) {
  const hasIn = !!record?.clock_in
  const hasOut = !!record?.clock_out
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-navy/40 mb-1">Hari ini</p>
        <p className="text-sm text-navy/60 mb-2">{fmtFullDate(TODAY)}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-navy leading-none">{record?.clock_in ?? '--:--'}</p>
          <span className="text-navy/30">→</span>
          <p className="text-3xl font-bold text-navy leading-none">{record?.clock_out ?? '--:--'}</p>
        </div>
        {hasIn && !hasOut && (
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />Anda belum clock-out hari ini.
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {!hasIn && <button className="btn-primary"><Clock className="w-4 h-4" />Masuk</button>}
        {hasIn && !hasOut && <button className="btn-primary"><Clock className="w-4 h-4" />Keluar</button>}
        <button className="btn-secondary" onClick={onOpen}>Detail</button>
      </div>
    </div>
  )
}

function SignalCard({
  icon: Icon, tone, title, body, action,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: 'amber' | 'navy'
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  const toneStyle = tone === 'amber'
    ? 'bg-amber-50 border-amber-200 text-amber-900'
    : 'bg-navy text-white border-navy'
  const iconStyle = tone === 'amber' ? 'text-amber-600' : 'text-white/80'
  return (
    <div className={`rounded-2xl border p-5 flex flex-wrap items-start gap-4 ${toneStyle}`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconStyle}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className={`text-xs mt-1 ${tone === 'amber' ? 'text-amber-800/80' : 'text-white/70'}`}>{body}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${tone === 'amber' ? 'bg-white text-amber-800 hover:bg-amber-100 border border-amber-300' : 'bg-white text-navy hover:bg-white/90'}`}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

function StatStrip() {
  const inMonth = mockAttendance.filter(a => a.date.startsWith('2026-06'))
  const present = inMonth.filter(a => a.status === 'present').length
  const absent  = inMonth.filter(a => a.status === 'absent').length
  const leave   = inMonth.filter(a => a.status === 'leave').length
  const partial = inMonth.filter(a => a.status === 'partial').length
  const cells: Array<[string, number, string]> = [
    ['Hadir',     present, 'text-emerald-600'],
    ['Sebagian',  partial, 'text-amber-600'],
    ['Cuti',      leave,   'text-blue-600'],
    ['Absen',     absent,  'text-red-600'],
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cells.map(([label, count, color]) => (
        <div key={label} className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-navy/40">{label}</p>
          <p className={`text-xl font-bold leading-tight mt-0.5 ${color}`}>{count}</p>
        </div>
      ))}
    </div>
  )
}

function CalendarGrid({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK_HEADERS.map(d => (
        <div key={d} className="text-center text-xs font-medium text-navy/40 py-1">{d}</div>
      ))}
      {Array.from({ length: FIRST_DOW }).map((_, i) => <div key={`off-${i}`} />)}
      {Array.from({ length: DAYS_IN_MONTH }).map((_, i) => {
        const day = i + 1
        const date = dayDate(day)
        const rec = recordMap[date]
        const isToday = date === TODAY
        const weekend = isWeekend(day)
        const base = `rounded-lg p-1.5 text-center border transition-all cursor-pointer hover:scale-[1.03] ${isToday ? 'ring-2 ring-navy ring-offset-1' : ''}`

        if (rec) {
          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className={`${base} ${STATUS_STYLE[rec.status]}`}
              title={STATUS_LABEL[rec.status]}
            >
              <p className="text-xs font-bold">{day}</p>
              {rec.clock_in && <p className="text-[9px] opacity-70">{rec.clock_in}</p>}
            </button>
          )
        }
        if (weekend) {
          return <div key={date} className={`${base} bg-gray-50 border-gray-100 cursor-default hover:scale-100`}>
            <p className="text-xs text-navy/20">{day}</p>
          </div>
        }
        return (
          <button
            key={date}
            type="button"
            onClick={() => onOpenDay(date)}
            className={`${base} bg-white border-border hover:bg-navy-50/50`}
          >
            <p className="text-xs text-navy/40">{day}</p>
          </button>
        )
      })}
    </div>
  )
}

function LegendRow() {
  return (
    <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border">
      {(['present', 'partial', 'leave', 'absent'] as const).map(k => (
        <div key={k} className="flex items-center gap-1.5 text-xs text-navy/60">
          <span className={`w-3 h-3 rounded-sm border ${STATUS_STYLE[k]}`} />
          {STATUS_LABEL[k]}
        </div>
      ))}
    </div>
  )
}

function DayDetailBody({
  record, subject, canClarify, onClarify,
}: {
  record: AttendanceRecord | null
  subject: { full_name: string; department: string; avatar?: string } | null
  canClarify: boolean
  onClarify: (status: AttendanceRecord['status']) => void
}) {
  if (!record) {
    return (
      <div className="space-y-5">
        {subject && <SubjectStrip subject={subject} />}
        <div className="text-center py-12 text-navy/50">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-navy/20" />
          <p className="text-sm">Belum ada catatan untuk tanggal ini.</p>
        </div>
      </div>
    )
  }
  const missing = record.clock_in && !record.clock_out
  return (
    <div className="space-y-5">
      {subject && <SubjectStrip subject={subject} />}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[record.status]}`}>
          {STATUS_LABEL[record.status]}
        </span>
        {missing && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" />Clock-out tidak tercatat
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Clock-in"  value={record.clock_in ?? '—'} />
        <Stat label="Clock-out" value={record.clock_out ?? '—'} />
      </div>

      {canClarify && missing && (
        <div className="rounded-xl border border-border p-4 bg-navy-50/30">
          <p className="text-xs font-semibold text-navy mb-2">Klarifikasi sebagai Admin Manager</p>
          <p className="text-xs text-navy/60 mb-3">
            Tentukan status hari ini sebelum cutoff bulanan. HR Admin akan mengunci rekap setelah cutoff.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              onClick={() => onClarify('present')}
            >
              Bekerja Penuh
            </button>
            <button
              className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              onClick={() => onClarify('partial')}
            >
              Sebagian
            </button>
            <button
              className="px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              onClick={() => onClarify('absent')}
            >
              Absen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubjectStrip({ subject }: { subject: { full_name: string; department: string; avatar?: string } }) {
  return (
    <div className="flex items-center gap-3 bg-navy/5 border border-navy/10 rounded-xl px-3 py-2.5">
      {subject.avatar
        ? <img src={subject.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        : <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0">
            {subject.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
      }
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy truncate">{subject.full_name}</p>
        <p className="text-xs text-navy/50 truncate">{subject.department}</p>
      </div>
    </div>
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
    </div>
  )
}

