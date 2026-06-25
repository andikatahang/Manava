import { useState } from 'react'
import {
  User, FileText, Calendar, Clock, Download, Plus,
  CheckCircle2, XCircle, AlertCircle, Briefcase, Star,
  TrendingUp, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockPayslips, mockLeaveRequests, mockAttendance, mockEditorMetrics } from '../../data/mockData'

type Tab = 'profile' | 'payslips' | 'leave' | 'attendance'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// My editor — demo fixed to Budi Santoso (e1)
const MY_EDITOR = {
  editor_id: 'e1',
  full_name: 'Budi Santoso',
  email: 'budi@faircut.id',
  department: 'Photo Retouching',
  specialization: ['Product Retouch', 'Color Correction'],
  base_salary: 8000000,
  status: 'active' as const,
  onboarded_at: '2026-01-15',
  phone: '+62 812-3456-7890',
  address: 'Jl. Sudirman No. 45, Jakarta Selatan',
  emergency_contact: 'Rina Santoso (+62 811-9999-0001)',
}

const LEAVE_BALANCE = { cuti: { total: 12, used: 2 }, izin: { total: 6, used: 1 } }

function LeaveBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : (used / total) * 100
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-navy/50 mb-1">
        <span>{used} used</span><span>{total - used} remaining</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function AttendanceCalendar({ records }: { records: typeof mockAttendance }) {
  const [viewYear, setViewYear] = useState(2026)
  const [viewMonth, setViewMonth] = useState(5) // 0-indexed June

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const recordMap = Object.fromEntries(
    records.map(r => [r.date, r])
  )

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
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]

  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const leave = records.filter(r => r.status === 'leave').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-emerald-600">{present}</p>
          <p className="text-xs text-navy/50 mt-0.5">Present</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-navy/50 mt-0.5">Absent</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-blue-500">{leave}</p>
          <p className="text-xs text-navy/50 mt-0.5">On Leave</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-navy">{MONTH_NAMES[viewMonth]} {viewYear}</p>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-navy/40 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const rec = recordMap[date]
            const day = new Date(date).getDate()
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
            ['bg-emerald-100 text-emerald-700', 'Present'],
            ['bg-amber-100 text-amber-700', 'Partial'],
            ['bg-red-100 text-red-600', 'Absent'],
            ['bg-blue-100 text-blue-600', 'Leave'],
          ].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${cls.split(' ')[0]}`} />
              <span className="text-xs text-navy/60">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent log */}
      <div className="card">
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Recent Log</p>
        <div className="space-y-0">
          {[...records].reverse().slice(0, 7).map(r => (
            <div key={r.date} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-navy">{formatDate(r.date)}</span>
              <div className="flex items-center gap-3">
                {r.clock_in && (
                  <span className="text-xs text-navy/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.clock_in}
                  </span>
                )}
                {r.clock_out && (
                  <span className="text-xs text-navy/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.clock_out}
                  </span>
                )}
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ESSPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [leaveModal, setLeaveModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'cuti', start: '', end: '', reason: '' })

  const myPayslips = mockPayslips.filter(p => p.editor_id === MY_EDITOR.editor_id)
  const myLeave = mockLeaveRequests.filter(l => l.editor_id === MY_EDITOR.editor_id)
  const myMetrics = mockEditorMetrics.find(e => e.editor_id === MY_EDITOR.editor_id)

  const TABS: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payslips', label: 'Payslips', icon: FileText },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
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

      {/* Profile */}
      {tab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Identity card */}
          <div className="card text-center">
            <div className="w-20 h-20 rounded-2xl bg-navy flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              {MY_EDITOR.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <h2 className="text-lg font-bold text-navy">{MY_EDITOR.full_name}</h2>
            <p className="text-sm text-navy/50 mt-0.5">{MY_EDITOR.department}</p>
            <StatusBadge status={MY_EDITOR.status} />
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {MY_EDITOR.specialization.map(s => (
                <span key={s} className="text-xs bg-navy-50 text-navy px-2.5 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
            <button onClick={() => setEditModal(true)} className="btn-secondary w-full justify-center mt-4 text-sm py-2">
              <User className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          {/* Details */}
          <div className="card lg:col-span-2">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Personal Information</p>
            <div className="grid sm:grid-cols-2 gap-0">
              {[
                ['Full Name', MY_EDITOR.full_name],
                ['Email', MY_EDITOR.email],
                ['Phone', MY_EDITOR.phone],
                ['Department', MY_EDITOR.department],
                ['Onboarded', formatDate(MY_EDITOR.onboarded_at)],
                ['Base Salary', formatCurrency(MY_EDITOR.base_salary)],
                ['Address', MY_EDITOR.address],
                ['Emergency Contact', MY_EDITOR.emergency_contact],
              ].map(([label, value]) => (
                <div key={label} className="py-3 border-b border-border last:border-0 sm:odd:pr-6">
                  <p className="text-xs text-navy/40 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-navy">{value}</p>
                </div>
              ))}
            </div>

            {/* Quick KPI snapshot */}
            {myMetrics && (
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">My KPI Snapshot</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-base font-bold text-navy">{myMetrics.avg_client_rating.toFixed(1)}</p>
                    <p className="text-xs text-navy/50">Client Rating</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-base font-bold text-navy">{myMetrics.completion_rate}%</p>
                    <p className="text-xs text-navy/50">Completion</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <Briefcase className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-base font-bold text-navy">{myMetrics.kpi_average.toFixed(2)}</p>
                    <p className="text-xs text-navy/50">KPI Score</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payslips */}
      {tab === 'payslips' && (
        <div className="grid lg:grid-cols-2 gap-5">
          {myPayslips.length === 0 ? (
            <div className="card text-center py-12 text-navy/30">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payslips yet</p>
            </div>
          ) : myPayslips.map(ps => (
            <div key={ps.payslip_id} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-navy">{formatDate(ps.period_start)} – {formatDate(ps.period_end)}</p>
                  <p className="text-xs text-navy/50 mt-0.5">Generated {formatDate(ps.generated_at.split('T')[0])}</p>
                </div>
                <StatusBadge status={ps.status} />
              </div>

              {/* Visual breakdown */}
              <div className="space-y-2">
                {[
                  { label: 'Base Salary', amount: ps.base_salary, type: 'base' },
                  { label: 'Project Bonus', amount: ps.project_bonus, type: 'plus' },
                  { label: 'Reimbursements', amount: ps.reimbursement_total, type: 'plus' },
                  { label: 'Attendance Deduction', amount: ps.attendance_deduction, type: 'minus' },
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

              {/* Net total */}
              <div className="flex items-center justify-between bg-navy-50 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-navy">Net Salary</span>
                <span className="text-lg font-bold text-navy">{formatCurrency(ps.net_salary)}</span>
              </div>

              {/* Bar chart of components */}
              <div className="space-y-1.5">
                {[
                  { label: 'Base', val: ps.base_salary, color: 'bg-navy' },
                  { label: 'Bonus', val: ps.project_bonus, color: 'bg-emerald-500' },
                  { label: 'Deduction', val: ps.attendance_deduction, color: 'bg-red-400' },
                ].map(({ label, val, color }) => {
                  const max = ps.base_salary + ps.project_bonus
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-navy/50 w-16 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${(val / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-navy/60 w-24 text-right shrink-0">{formatCurrency(val)}</span>
                    </div>
                  )
                })}
              </div>

              <button className="btn-secondary w-full justify-center text-sm py-2">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Leave */}
      {tab === 'leave' && (
        <div className="space-y-5 max-w-2xl">
          {/* Balances */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-navy">Annual Leave (Cuti)</p>
              </div>
              <p className="text-2xl font-bold text-navy">{LEAVE_BALANCE.cuti.total - LEAVE_BALANCE.cuti.used} <span className="text-base font-normal text-navy/40">days remaining</span></p>
              <LeaveBar used={LEAVE_BALANCE.cuti.used} total={LEAVE_BALANCE.cuti.total} color="bg-blue-500" />
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-navy">Sick / Permission (Izin)</p>
              </div>
              <p className="text-2xl font-bold text-navy">{LEAVE_BALANCE.izin.total - LEAVE_BALANCE.izin.used} <span className="text-base font-normal text-navy/40">days remaining</span></p>
              <LeaveBar used={LEAVE_BALANCE.izin.used} total={LEAVE_BALANCE.izin.total} color="bg-amber-500" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Request History</p>
            <button onClick={() => setLeaveModal(true)} className="btn-primary text-sm py-2">
              <Plus className="w-3.5 h-3.5" /> Request Leave
            </button>
          </div>

          <div className="space-y-3">
            {myLeave.length === 0 && (
              <div className="card text-center py-10 text-navy/30">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No leave requests yet</p>
              </div>
            )}
            {myLeave.map(l => (
              <div key={l.leave_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-navy capitalize">{l.leave_type === 'cuti' ? 'Annual Leave' : 'Permission / Sick'}</span>
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
                    Submitted {formatDate(l.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance */}
      {tab === 'attendance' && (
        <AttendanceCalendar records={mockAttendance} />
      )}

      {/* Leave Request Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Request Leave">
        <div className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[['cuti', 'Annual Leave (Cuti)', LEAVE_BALANCE.cuti.total - LEAVE_BALANCE.cuti.used], ['izin', 'Permission / Sick (Izin)', LEAVE_BALANCE.izin.total - LEAVE_BALANCE.izin.used]].map(([val, label, bal]) => (
                <button
                  key={val}
                  onClick={() => setLeaveForm(f => ({ ...f, type: val as string }))}
                  className={`p-3 rounded-xl border text-left transition-all ${leaveForm.type === val ? 'border-navy bg-navy-50' : 'border-border hover:border-navy/30'}`}
                >
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-navy/50 mt-0.5">{bal} days remaining</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={leaveForm.start} onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={leaveForm.end} onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea rows={3} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} className="input resize-none" placeholder="Brief reason for leave..." />
          </div>
          {leaveForm.start && leaveForm.end && leaveForm.start <= leaveForm.end && (
            <div className="bg-navy-50/60 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span className="text-navy/60">Duration</span>
              <span className="font-semibold text-navy">
                {Math.round((new Date(leaveForm.end).getTime() - new Date(leaveForm.start).getTime()) / 86400000) + 1} day(s)
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setLeaveModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => setLeaveModal(false)} className="btn-primary">Submit Request</button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Profile" size="lg">
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['Full Name', 'full_name', MY_EDITOR.full_name],
            ['Email', 'email', MY_EDITOR.email],
            ['Phone', 'phone', MY_EDITOR.phone],
            ['Address', 'address', MY_EDITOR.address],
            ['Emergency Contact', 'emergency_contact', MY_EDITOR.emergency_contact],
          ].map(([label, , value]) => (
            <div key={label} className={label === 'Address' || label === 'Emergency Contact' ? 'sm:col-span-2' : ''}>
              <label className="label">{label}</label>
              <input defaultValue={value} className="input" />
            </div>
          ))}
          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => setEditModal(false)} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
