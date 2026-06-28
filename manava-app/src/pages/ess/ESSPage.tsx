import { useState } from 'react'
import {
  FileText, Calendar, Clock, Download, Plus, History, Wallet,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockPayslips, mockLeaveRequests, mockAttendance } from '../../data/mockData'
import { MY_EDITOR } from '../../data/myEditor'

type Page = 'menu' | 'absensi-cuti' | 'gaji'

const SERIF = "ui-serif, Georgia, 'Times New Roman', serif"

const MONTH_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// Demo "current" period — the latest month with data (June 2026).
const CURRENT = { year: 2026, month: 5 } // 0-indexed June
const PREV = { year: 2026, month: 4 }    // 0-indexed May

const LEAVE_BALANCE = { cuti: { total: 12, used: 2 }, izin: { total: 6, used: 1 } }

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

function AttendanceCalendar({ records, initialYear, initialMonth, navigable }: {
  records: typeof mockAttendance
  initialYear: number
  initialMonth: number
  navigable: boolean
}) {
  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)

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
      <div className="grid grid-cols-3 gap-3">
        <div className="card-svc text-center py-3">
          <p className="text-xl font-bold text-emerald-600">{present}</p>
          <p className="text-xs text-navy/50 mt-0.5">Hadir</p>
        </div>
        <div className="card-svc text-center py-3">
          <p className="text-xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-navy/50 mt-0.5">Absen</p>
        </div>
        <div className="card-svc text-center py-3">
          <p className="text-xl font-bold text-blue-500">{leave}</p>
          <p className="text-xs text-navy/50 mt-0.5">Cuti</p>
        </div>
      </div>

      <div className="card-svc">
        <div className="flex items-center justify-between mb-4">
          {navigable ? (
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : <span className="w-7" />}
          <p className="text-sm font-semibold text-navy">{MONTH_FULL[viewMonth]} {viewYear}</p>
          {navigable ? (
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : <span className="w-7" />}
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
            ['bg-emerald-100 text-emerald-700', 'Hadir'],
            ['bg-amber-100 text-amber-700', 'Sebagian'],
            ['bg-red-100 text-red-600', 'Absen'],
            ['bg-blue-100 text-blue-600', 'Cuti'],
          ].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${cls.split(' ')[0]}`} />
              <span className="text-xs text-navy/60">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PayslipCard({ ps }: { ps: typeof mockPayslips[number] }) {
  return (
    <div className="card-svc space-y-4">
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
  )
}

// Navigation card in the image's style: warm-gray surface, media zone breathing
// at the top, serif title + muted description anchored at the bottom, sharp radius.
function ServiceCard({ icon: Icon, title, desc, onClick }: {
  icon: typeof Clock
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left flex flex-col min-h-[248px] rounded-[8px] p-7 bg-[#fbfbfb] border border-black/[0.05] shadow-[0_1px_2px_rgba(2,21,38,0.04)] hover:border-black/[0.1] hover:shadow-[0_14px_44px_-16px_rgba(2,21,38,0.18)] hover:-translate-y-0.5 transition-all duration-200 motion-reduce:hover:translate-y-0"
    >
      <div className="flex-1 flex items-center justify-center min-h-[120px] mb-7">
        <Icon className="w-14 h-14 text-navy/15 group-hover:text-navy/25 transition-colors" strokeWidth={1.25} />
      </div>
      <div>
        <h3 className="text-[22px] leading-tight tracking-[-0.01em] text-[#021526]" style={{ fontFamily: SERIF }}>{title}</h3>
        <p className="text-[14px] leading-relaxed text-[#596074] mt-1.5">{desc}</p>
      </div>
    </button>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, onHistory }: {
  icon: typeof FileText
  title: string
  subtitle?: string
  onHistory?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center text-navy shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-navy leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-navy/45">{subtitle}</p>}
        </div>
      </div>
      {onHistory && (
        <button
          onClick={onHistory}
          className="inline-flex items-center gap-1 text-xs font-medium text-navy/60 hover:text-navy transition-colors"
        >
          <History className="w-3.5 h-3.5" /> Riwayat
        </button>
      )}
    </div>
  )
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/60 hover:text-navy transition-colors"
    >
      <ChevronLeft className="w-4 h-4" /> {label}
    </button>
  )
}

export default function ESSPage() {
  const [page, setPage] = useState<Page>('menu')
  const [history, setHistory] = useState(false)
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'cuti', start: '', end: '', reason: '' })

  const myPayslips = mockPayslips
    .filter(p => p.editor_id === MY_EDITOR.editor_id)
    .sort((a, b) => b.period_start.localeCompare(a.period_start))
  const myLeave = mockLeaveRequests.filter(l => l.editor_id === MY_EDITOR.editor_id)

  const currentPayslip = myPayslips.find(p => p.period_start.startsWith(monthKey(CURRENT.year, CURRENT.month)))
  const pastPayslips = myPayslips.filter(p => p !== currentPayslip)
  const currentLabel = `${MONTH_FULL[CURRENT.month]} ${CURRENT.year}`

  function open(p: Page) { setPage(p); setHistory(false) }

  // ── Menu ────────────────────────────────────────────────────────────────
  if (page === 'menu') {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-base font-semibold text-navy">Layanan Mandiri</h2>
          <p className="text-sm text-navy/50 mt-0.5">Kelola data kepegawaian Anda. Pilih layanan untuk melanjutkan.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <ServiceCard
            icon={Clock}
            title="Absensi & Cuti"
            desc="Pantau kehadiran bulan ini, ajukan cuti, dan tinjau riwayat absensi."
            onClick={() => open('absensi-cuti')}
          />
          <ServiceCard
            icon={Wallet}
            title="Gaji"
            desc="Lihat slip gaji bulan berjalan beserta riwayat penggajian Anda."
            onClick={() => open('gaji')}
          />
        </div>
      </div>
    )
  }

  // ── Absensi & Cuti ──────────────────────────────────────────────────────
  if (page === 'absensi-cuti') {
    if (history) {
      return (
        <div className="space-y-5">
          <BackLink label="Absensi & Cuti" onClick={() => setHistory(false)} />
          <h2 className="text-lg font-bold text-navy">Riwayat Absensi</h2>
          <AttendanceCalendar records={mockAttendance} initialYear={PREV.year} initialMonth={PREV.month} navigable />
        </div>
      )
    }
    return (
      <div className="max-w-3xl space-y-8">
        <div className="space-y-3">
          <BackLink label="Layanan Mandiri" onClick={() => setPage('menu')} />
          <h2 className="text-lg font-bold text-navy">Absensi & Cuti</h2>
        </div>

        {/* Absensi — current month */}
        <section>
          <SectionHeader icon={Clock} title="Absensi" subtitle={currentLabel} onHistory={() => setHistory(true)} />
          <AttendanceCalendar records={mockAttendance} initialYear={CURRENT.year} initialMonth={CURRENT.month} navigable={false} />
        </section>

        {/* Cuti & Izin */}
        <section>
          <SectionHeader icon={Calendar} title="Cuti & Izin" subtitle="Sisa kuota & permohonan" />
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card-svc">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-semibold text-navy">Cuti Tahunan</p>
                </div>
                <p className="text-2xl font-bold text-navy">{LEAVE_BALANCE.cuti.total - LEAVE_BALANCE.cuti.used} <span className="text-base font-normal text-navy/40">hari tersisa</span></p>
                <LeaveBar used={LEAVE_BALANCE.cuti.used} total={LEAVE_BALANCE.cuti.total} color="bg-blue-500" />
              </div>
              <div className="card-svc">
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
                <div className="card-svc text-center py-10 text-navy/30">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada permohonan cuti</p>
                </div>
              )}
              {myLeave.map(l => (
                <div key={l.leave_id} className="card-svc">
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
        </section>

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

  // ── Gaji ────────────────────────────────────────────────────────────────
  if (history) {
    return (
      <div className="space-y-5">
        <BackLink label="Gaji" onClick={() => setHistory(false)} />
        <h2 className="text-lg font-bold text-navy">Riwayat Slip Gaji</h2>
        {pastPayslips.length === 0 ? (
          <div className="card-svc text-center py-12 text-navy/30">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada slip gaji bulan sebelumnya</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {pastPayslips.map(ps => <PayslipCard key={ps.payslip_id} ps={ps} />)}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <BackLink label="Layanan Mandiri" onClick={() => setPage('menu')} />
        <h2 className="text-lg font-bold text-navy">Gaji</h2>
      </div>
      <section>
        <SectionHeader icon={FileText} title="Slip Gaji" subtitle={currentLabel} onHistory={() => setHistory(true)} />
        {currentPayslip ? (
          <PayslipCard ps={currentPayslip} />
        ) : (
          <div className="card-svc text-center py-10 text-navy/30">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada slip gaji bulan ini</p>
          </div>
        )}
      </section>
    </div>
  )
}
