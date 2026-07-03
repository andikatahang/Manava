import { useState } from 'react'
import {
  FileText, Calendar, Clock, Download, Plus,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockPayslips, mockLeaveRequests, mockAttendance, mockUsers } from '../../data/mockData'
import { MY_EDITOR } from '../../data/myEditor'
import { PageHeader } from '../../components/page/PageHeader'
import type { UserRole } from '../../types'

// The self-service subject depends on who is logged in — an editor sees their own
// records; an Admin Manager or HR Admin sees theirs. Keeps the page "based on the user".
function selfIdFor(role: UserRole): string {
  if (role === 'admin_manager') return mockUsers.admin_manager.user_id
  if (role === 'hr_admin') return mockUsers.hr_admin.user_id
  return MY_EDITOR.editor_id
}

type Tab = 'absensi' | 'cuti' | 'gaji'

const MONTH_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// Demo "current" month with data (June 2026).
const CURRENT = { year: 2026, month: 5 }

const LEAVE_BALANCE = { cuti: { total: 12, used: 2 }, izin: { total: 6, used: 1 } }

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: 'absensi', label: 'Presensi', icon: Clock },
  { id: 'cuti', label: 'Cuti & Izin', icon: Calendar },
  { id: 'gaji', label: 'Slip Gaji', icon: FileText },
]

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function LeaveBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : (used / total) * 100
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-navy/50 mb-1">
        <span>{used} terpakai</span><span>{total - used} tersisa</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function AttendanceTab({ role }: { role: UserRole }) {
  const [viewYear, setViewYear] = useState(CURRENT.year)
  const [viewMonth, setViewMonth] = useState(CURRENT.month)

  const records = mockAttendance
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const recordMap = Object.fromEntries(records.map(r => [r.date, r]))
  const monthRecords = records.filter(r => r.date.startsWith(monthKey(viewYear, viewMonth)))

  const statusStyle = (status?: string) => {
    if (!status) return 'bg-gray-50 text-navy/20'
    return {
      present: 'bg-emerald-100 text-emerald-700 font-semibold',
      partial:  'bg-amber-100 text-amber-700 font-semibold',
      absent:   'bg-red-100 text-red-600 font-semibold',
      leave:    'bg-blue-100 text-blue-600 font-semibold',
    }[status] ?? 'bg-gray-50 text-navy/30'
  }

  const prev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const next = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const cells: (string | null)[] = [
    ...Array(firstDay === 0 ? 6 : firstDay - 1).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${monthKey(viewYear, viewMonth)}-${String(i + 1).padStart(2, '0')}`),
  ]

  const present = monthRecords.filter(r => r.status === 'present' || r.status === 'partial').length
  const absent = monthRecords.filter(r => r.status === 'absent').length
  const leave = monthRecords.filter(r => r.status === 'leave').length

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Layanan mandiri"
        title="ESS — Presensi, Cuti, Slip Gaji"
        description="Lihat ringkasan kehadiran bulanan, ajukan cuti, dan unduh payslip Anda."
        role={role}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-emerald-600">{present}</p>
          <p className="text-xs text-navy/50 mt-0.5">Hadir</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-navy/50 mt-0.5">Absen</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-blue-500">{leave}</p>
          <p className="text-xs text-navy/50 mt-0.5">Cuti</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-navy">{MONTH_FULL[viewMonth]} {viewYear}</p>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-navy/40 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const rec = recordMap[date]
            const day = Number(date.slice(-2))
            const dow = new Date(date).getDay()
            const isWeekend = dow === 0 || dow === 6
            return (
              <div
                key={date}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-colors ${
                  isWeekend && !rec ? 'text-navy/20' : statusStyle(rec?.status)
                }`}
                title={rec ? `${rec.status}${rec.clock_in ? ` · In: ${rec.clock_in}` : ''}${rec.clock_out ? ` Out: ${rec.clock_out}` : ''}` : undefined}
              >
                {day}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
          {[
            ['bg-emerald-100', 'Hadir'],
            ['bg-amber-100', 'Sebagian'],
            ['bg-red-100', 'Absen'],
            ['bg-blue-100', 'Cuti'],
          ].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${cls}`} />
              <span className="text-xs text-navy/60">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GajiTab({ selfId }: { selfId: string }) {
  const payslips = mockPayslips
    .filter(p => p.editor_id === selfId)
    .sort((a, b) => b.period_start.localeCompare(a.period_start))

  if (payslips.length === 0) {
    return (
      <div className="card text-center py-12 text-navy/30">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Belum ada slip gaji</p>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {payslips.map(ps => (
        <div key={ps.payslip_id} className="card space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-navy">{formatDate(ps.period_start)} – {formatDate(ps.period_end)}</p>
              <p className="text-xs text-navy/50 mt-0.5">Dibuat {formatDate(ps.generated_at.split('T')[0])}</p>
            </div>
            <StatusBadge status={ps.status} />
          </div>

          <div className="space-y-2">
            {[
              { label: 'Gaji Pokok', amount: ps.base_salary, type: 'base' },
              { label: 'Bonus Proyek', amount: ps.project_bonus, type: 'plus' },
              { label: 'Reimbursement', amount: ps.reimbursement_total, type: 'plus' },
              { label: 'Potongan Absensi', amount: ps.attendance_deduction, type: 'minus' },
            ].map(({ label, amount, type }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {type === 'plus' && <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {type === 'minus' && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  {type === 'base' && <div className="w-3.5 h-3.5 shrink-0" />}
                  <span className="text-sm text-navy/70">{label}</span>
                </div>
                <span className={`text-sm font-medium ${type === 'minus' ? 'text-red-600' : type === 'plus' ? 'text-emerald-600' : 'text-navy'}`}>
                  {type === 'minus' ? '−' : type === 'plus' ? '+' : ''}{formatCurrency(amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-navy-50 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-navy">Gaji Bersih</span>
            <span className="text-lg font-bold text-navy">{formatCurrency(ps.net_salary)}</span>
          </div>

          <button className="btn-secondary w-full justify-center text-sm py-2">
            <Download className="w-3.5 h-3.5" /> Unduh PDF
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ESSPage({ role = 'editor' }: { role?: UserRole }) {
  const [tab, setTab] = useState<Tab>('absensi')
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'cuti', start: '', end: '', reason: '' })

  const selfId = selfIdFor(role)
  const myLeave = mockLeaveRequests.filter(l => l.requester_id === selfId)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === id ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'absensi' && <AttendanceTab role={role} />}

      {tab === 'gaji' && <GajiTab selfId={selfId} />}

      {tab === 'cuti' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-navy">Cuti Tahunan</p>
              </div>
              <p className="text-2xl font-bold text-navy">{LEAVE_BALANCE.cuti.total - LEAVE_BALANCE.cuti.used} <span className="text-base font-normal text-navy/40">hari tersisa</span></p>
              <LeaveBar used={LEAVE_BALANCE.cuti.used} total={LEAVE_BALANCE.cuti.total} color="bg-blue-500" />
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-navy">Izin / Sakit</p>
              </div>
              <p className="text-2xl font-bold text-navy">{LEAVE_BALANCE.izin.total - LEAVE_BALANCE.izin.used} <span className="text-base font-normal text-navy/40">hari tersisa</span></p>
              <LeaveBar used={LEAVE_BALANCE.izin.used} total={LEAVE_BALANCE.izin.total} color="bg-amber-500" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Riwayat Permohonan</p>
            <button onClick={() => setLeaveModal(true)} className="btn-primary text-sm py-2">
              <Plus className="w-3.5 h-3.5" /> Ajukan Cuti
            </button>
          </div>

          <div className="space-y-3">
            {myLeave.length === 0 && (
              <div className="card text-center py-10 text-navy/30">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Belum ada permohonan cuti</p>
              </div>
            )}
            {myLeave.map(l => (
              <div key={l.leave_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-navy capitalize">{l.leave_type === 'cuti' ? 'Cuti Tahunan' : 'Izin / Sakit'}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-xs text-navy/50">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-navy/40">
                    {l.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {l.status === 'rejected' && <XCircle className="w-4 h-4 text-red-400" />}
                    {l.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                    Diajukan {formatDate(l.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Ajukan Cuti">
        <div className="space-y-4">
          <div>
            <label className="label">Jenis Cuti</label>
            <div className="grid grid-cols-2 gap-2">
              {[['cuti', 'Cuti Tahunan', LEAVE_BALANCE.cuti.total - LEAVE_BALANCE.cuti.used], ['izin', 'Izin / Sakit', LEAVE_BALANCE.izin.total - LEAVE_BALANCE.izin.used]].map(([val, label, bal]) => (
                <button
                  key={val}
                  onClick={() => setLeaveForm(f => ({ ...f, type: val as string }))}
                  className={`p-3 rounded-xl border text-left transition-all ${leaveForm.type === val ? 'border-navy bg-navy-50' : 'border-border hover:border-navy/30'}`}
                >
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-navy/50 mt-0.5">{bal} hari tersisa</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal Mulai</label>
              <input type="date" value={leaveForm.start} onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Tanggal Selesai</label>
              <input type="date" value={leaveForm.end} onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Alasan</label>
            <textarea rows={3} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} className="input resize-none" placeholder="Alasan singkat cuti..." />
          </div>
          {leaveForm.start && leaveForm.end && leaveForm.start <= leaveForm.end && (
            <div className="bg-navy-50/60 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span className="text-navy/60">Durasi</span>
              <span className="font-semibold text-navy">
                {Math.round((new Date(leaveForm.end).getTime() - new Date(leaveForm.start).getTime()) / 86400000) + 1} hari
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setLeaveModal(false)} className="btn-secondary">Batal</button>
            <button onClick={() => setLeaveModal(false)} className="btn-primary">Kirim Permohonan</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
