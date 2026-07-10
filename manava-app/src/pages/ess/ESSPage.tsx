// Layanan Mandiri (ESS) — semuanya data asli milik akun yang login:
// absensi dari /attendance (kalender + statistik), cuti dari /leave-requests
// (pengajuan + riwayat), gaji dari /payroll/mine (slip yang sudah difinalisasi).

import { useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Clock, Plus, Wallet, TrendingUp, UserX } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { formatDate, formatCurrency } from '../../lib/utils'
import type { UserRole } from '../../types'
import { useMe } from '../../hooks/queries/useMe'
import { useAttendanceRecords, useAttendanceToday } from '../../hooks/queries/useAttendance'
import { useLeaveRequests, useLeaveRequestMutations } from '../../hooks/queries/useLeaveRequests'
import { ROUTES_TO_LABEL, type RequesterRole } from '../../lib/leaveRequests'
import type { Attendance } from '../../lib/attendance'
import { STATUS_LABELS as PAYSLIP_STATUS_LABELS, type Payslip, type PayslipStatus } from '../../lib/payroll'
import { useMyPayslips } from '../../hooks/queries/usePayroll'
import { CalendarCard, DayDetailBody, StatStrip } from '../attendance/AttendanceTab'
import { MyKpiScore } from './MyKpiScore'
import { MyReimbursements } from './MyReimbursements'

type Tab = 'absensi' | 'cuti' | 'klaim' | 'kpi' | 'gaji'

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: 'absensi', label: 'Absensi', icon: Clock },
  { id: 'cuti', label: 'Cuti & Izin', icon: Calendar },
  { id: 'klaim', label: 'Klaim Dana Operasional', icon: Wallet },
  { id: 'kpi', label: 'Indeks Kepuasan Klien', icon: TrendingUp },
  { id: 'gaji', label: 'Slip Gaji', icon: Wallet },
]

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ESSPage({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<Tab>('absensi')
  // Payroll is scoped to the Editor model (only editors have base_salary) —
  // Admin Manager has no payslip data at all, so hide the tab rather than
  // show a permanently-failing fetch.
  // Klaim dana operasional hanya untuk editor (data producer level operasional).
  const tabs = role === 'editor' ? TABS : TABS.filter(t => t.id !== 'gaji' && t.id !== 'klaim')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'absensi' && <MyAttendance />}
      {tab === 'cuti' && <MyLeave role={role} />}
      {tab === 'klaim' && <MyReimbursements />}
      {tab === 'kpi' && <MyKpiScore />}
      {tab === 'gaji' && <MyPayslips />}
    </div>
  )
}

// ── Absensi: kalender + statistik bulan berjalan (data /attendance milik sendiri)

function MyAttendance() {
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const todayQuery = useAttendanceToday()
  const recordsQuery = useAttendanceRecords({ month, user_id: 'me' })
  const leaveQuery = useLeaveRequests()
  const me = todayQuery.data?.me
  const [dayDetail, setDayDetail] = useState<Attendance | null>(null)

  const records = recordsQuery.data ?? []
  const recordMap = useMemo(() => Object.fromEntries(records.map(r => [r.date, r])), [records])
  const myLeaves = useMemo(
    () => (leaveQuery.data ?? []).filter(l => l.requester_id === me),
    [leaveQuery.data, me],
  )

  return (
    <div className="space-y-4 max-w-2xl">
      <StatStrip records={records} />
      <CalendarCard
        month={month}
        onMonthChange={setMonth}
        recordMap={recordMap}
        leaves={myLeaves}
        today={todayQuery.data?.server_date ?? ''}
        onOpenDay={date => {
          const rec = recordMap[date]
          if (rec) setDayDetail(rec)
        }}
      />
      <Drawer
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        title={dayDetail ? formatDate(dayDetail.date) : ''}
        subtitle="Detail presensi"
      >
        {dayDetail && <DayDetailBody record={dayDetail} />}
      </Drawer>
    </div>
  )
}

// ── Cuti & Izin: pengajuan DB-backed + riwayat milik sendiri ─────────────────

type LeaveForm = { type: 'cuti' | 'izin'; start: string; end: string; reason: string }

function MyLeave({ role }: { role: UserRole }) {
  const meQuery = useMe()
  const leaveQuery = useLeaveRequests()
  const { submit } = useLeaveRequestMutations()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<LeaveForm>({ type: 'cuti', start: '', end: '', reason: '' })
  const [toast, setToast] = useState<string | null>(null)

  // Editors and Admin Managers file leave; each request travels one level up.
  const canRequest = role === 'editor' || role === 'admin_manager'
  const myRequesterRole: RequesterRole = role === 'admin_manager' ? 'admin_manager' : 'editor'
  const myLeaves = useMemo(
    () => (leaveQuery.data ?? []).filter(l => l.requester_id === meQuery.data?.user_id),
    [leaveQuery.data, meQuery.data],
  )

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }
  function send() {
    if (!form.start || !form.end) return
    submit.mutate(
      {
        leave_type: form.type,
        start_date: form.start,
        end_date: form.end,
        ...(form.reason.trim() ? { reason: form.reason.trim().slice(0, 500) } : {}),
      },
      {
        onSuccess: () => {
          setModal(false)
          setForm({ type: 'cuti', start: '', end: '', reason: '' })
          flash(`Permohonan terkirim ke ${ROUTES_TO_LABEL[myRequesterRole]}.`)
        },
        onError: e => flash(e instanceof Error ? e.message : 'Gagal mengirim permohonan.'),
      },
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-navy/60">{myLeaves.length} permohonan tercatat</p>
        {canRequest && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-navy/50">
              Disetujui oleh <span className="font-medium text-navy">{ROUTES_TO_LABEL[myRequesterRole]}</span>
            </span>
            <button className="btn-primary text-sm" onClick={() => setModal(true)}>
              <Plus className="w-4 h-4" /> Ajukan Cuti
            </button>
          </div>
        )}
      </div>

      {myLeaves.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-navy/20" />
          <p className="text-sm text-navy/50">Belum ada permohonan cuti.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border bg-white border border-border rounded-2xl overflow-hidden">
          {myLeaves.map(l => (
            <li key={l.leave_id} className="px-4 py-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">
                  {l.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin / Sakit'}
                </p>
                <p className="text-xs text-navy/50">
                  {formatDate(l.start_date)} – {formatDate(l.end_date)} · diajukan {formatDate(l.created_at)}
                </p>
                {l.status !== 'pending' && l.decided_by_name && (
                  <p className="text-xs text-navy/50 mt-0.5">
                    {l.status === 'approved' ? 'Disetujui' : 'Ditolak'} oleh {l.decided_by_name}
                    {l.decided_at ? ` · ${formatDate(l.decided_at)}` : ''}
                    {l.decision_note ? ` — “${l.decision_note}”` : ''}
                  </p>
                )}
              </div>
              <StatusBadge status={l.status} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Ajukan Cuti">
        <div className="space-y-4">
          <div>
            <label className="label">Jenis</label>
            <div className="grid grid-cols-2 gap-2">
              {([['cuti', 'Cuti Tahunan'], ['izin', 'Izin / Sakit']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, type: v }))}
                  className={`p-3 rounded-xl border text-left transition-all ${form.type === v ? 'border-navy bg-navy/5' : 'border-border'}`}
                >
                  <p className={`text-sm font-semibold ${form.type === v ? 'text-navy' : 'text-navy/60'}`}>{l}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mulai</label>
              <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Selesai</label>
              <input type="date" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Alasan (opsional)</label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="input resize-none"
              placeholder={`Cantumkan konteks untuk ${ROUTES_TO_LABEL[myRequesterRole]} Anda.`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">Batal</button>
            <button
              disabled={!form.start || !form.end || submit.isPending}
              onClick={send}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />{submit.isPending ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Slip gaji: daftar milik sendiri dari /payroll/mine (draft HR disembunyikan)

const PAYSLIP_STATUS_CHIP: Record<PayslipStatus, string> = {
  draft:     'bg-amber-50 text-amber-700 border-amber-200',
  finalized: 'bg-navy-50 text-navy border-navy/15',
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  voided:    'bg-red-50 text-red-700 border-red-200',
}

function MyPayslips() {
  const { data: slips = [], isLoading, error } = useMyPayslips()
  const [detail, setDetail] = useState<Payslip | null>(null)

  if (isLoading) {
    return <div className="card text-center py-14 max-w-2xl"><p className="text-sm text-navy/50">Memuat slip gaji…</p></div>
  }
  if (error) {
    return <div className="card text-center py-14 max-w-2xl"><p className="text-sm text-red-600">Gagal memuat slip gaji.</p></div>
  }
  if (slips.length === 0) {
    return (
      <div className="card text-center py-14 max-w-2xl">
        <Wallet className="w-10 h-10 mx-auto mb-3 text-navy/20" />
        <p className="text-sm font-semibold text-navy">Belum ada slip gaji</p>
        <p className="text-xs text-navy/50 mt-1">Slip gaji akan muncul di sini setelah HR memproses payroll.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {slips.map(s => (
        <button
          key={s.payslip_id}
          onClick={() => setDetail(s)}
          className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-white hover:border-navy/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy">
              {formatDate(s.period_start)} – {formatDate(s.period_end)}
            </p>
            <p className="text-xs text-navy/50">
              {s.absent_days > 0 && <span className="inline-flex items-center gap-1 mr-2"><UserX className="w-3 h-3" />{s.absent_days} hari bolong</span>}
              Net {formatCurrency(s.net_salary)}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${PAYSLIP_STATUS_CHIP[s.status]}`}>
            {PAYSLIP_STATUS_LABELS[s.status]}
          </span>
        </button>
      ))}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Slip Gaji — ${formatDate(detail.period_start)}` : ''} size="md">
        {detail && (
          <div className="space-y-3 text-[13px]">
            <PayslipRow label="Periode" value={`${formatDate(detail.period_start)} – ${formatDate(detail.period_end)}`} />
            <PayslipRow label="Hari Kerja" value={`${detail.working_days} hari`} />
            <PayslipRow label="Hari Bolong" value={`${detail.absent_days} hari`} />
            <PayslipRow label="Gaji Pokok" value={formatCurrency(detail.base_salary)} />
            <PayslipRow label="Lembur" value={`+${formatCurrency(detail.overtime_pay)}`} tone="text-emerald-700" />
            <PayslipRow label="Bonus" value={`+${formatCurrency(detail.project_bonus)}`} tone="text-emerald-700" />
            <PayslipRow label="Reimbursement" value={`+${formatCurrency(detail.reimbursement_total)}`} tone="text-emerald-700" />
            <PayslipRow label="Gaji Bruto" value={formatCurrency(detail.gross_salary)} />
            <PayslipRow label="Potongan Absen" value={`-${formatCurrency(detail.attendance_deduction)}`} tone="text-red-600" />
            {detail.presensi_penalty > 0 && (
              <PayslipRow label="Denda Presensi" value={`-${formatCurrency(detail.presensi_penalty)}`} tone="text-red-600" />
            )}
            <PayslipRow label="PPh 21" value={`-${formatCurrency(detail.pph21_tax)}`} tone="text-red-600" />
            <PayslipRow label="BPJS Kesehatan" value={`-${formatCurrency(detail.bpjs_kesehatan)}`} tone="text-red-600" />
            <PayslipRow
              label="BPJS Ketenagakerjaan"
              value={`-${formatCurrency(detail.bpjs_tk_jkk + detail.bpjs_tk_jkm + detail.bpjs_tk_jht + detail.bpjs_tk_jp)}`}
              tone="text-red-600"
            />
            <PayslipRow label="Total Potongan" value={`-${formatCurrency(detail.total_deductions)}`} tone="text-red-600" />
            {detail.payment_reference && (
              <PayslipRow label="Referensi Pembayaran" value={detail.payment_reference} tone="text-emerald-700" />
            )}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">Net Salary</span>
              <span className="text-lg font-bold text-navy">{formatCurrency(detail.net_salary)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PayslipRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy/55">{label}</span>
      <span className={`font-medium ${tone ?? 'text-navy'}`}>{value}</span>
    </div>
  )
}
