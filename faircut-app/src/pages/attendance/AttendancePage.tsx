import { useState } from 'react'
import { Clock, Calendar, FileText, CheckCircle, XCircle, CheckCircle2, AlertCircle, Play } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockAttendance, mockLeaveRequests, mockPayslips } from '../../data/mockData'
import type { UserRole } from '../../types'

const STATUS_STYLE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent:  'bg-red-100   text-red-700   border-red-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  leave:   'bg-blue-100  text-blue-700  border-blue-200',
}

const CAL_YEAR = 2026
const CAL_MONTH = 6
const DAYS_IN_MONTH = new Date(CAL_YEAR, CAL_MONTH, 0).getDate()      // 30
const FIRST_DOW     = new Date(CAL_YEAR, CAL_MONTH - 1, 1).getDay()   // 1 (Mon)
const WEEK_HEADERS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const recordMap = Object.fromEntries(mockAttendance.map(a => [a.date, a]))

function isWeekend(day: number) {
  return [0, 6].includes(new Date(CAL_YEAR, CAL_MONTH - 1, day).getDay())
}

function dayDate(day: number) {
  return `${CAL_YEAR}-0${CAL_MONTH}-${String(day).padStart(2, '0')}`
}

export default function AttendancePage({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<'attendance' | 'leave' | 'payroll'>('attendance')
  const [leaves, setLeaves] = useState(mockLeaveRequests)
  const [leaveModal, setLeaveModal] = useState(false)
  const [payrollToast, setPayrollToast] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'cuti', start: '', end: '' })

  const isManager = role === 'superadmin' || role === 'admin_manager'
  const isFinance  = role === 'finance'   || role === 'superadmin'

  const present  = mockAttendance.filter(a => a.status === 'present').length
  const absent   = mockAttendance.filter(a => a.status === 'absent').length
  const onLeave  = mockAttendance.filter(a => a.status === 'leave').length
  const partial  = mockAttendance.filter(a => a.status === 'partial').length

  const TODAY = '2026-06-26'
  const todayRec = recordMap[TODAY]
  const pendingCount = leaves.filter(l => l.status === 'pending').length

  function approveLeave(id: string) {
    setLeaves(prev => prev.map(l => l.leave_id === id ? { ...l, status: 'approved' as const } : l))
  }
  function rejectLeave(id: string) {
    setLeaves(prev => prev.map(l => l.leave_id === id ? { ...l, status: 'rejected' as const } : l))
  }

  function handleRunPayroll() {
    setPayrollToast(true)
    setTimeout(() => setPayrollToast(false), 3000)
  }

  function leaveDuration() {
    if (!leaveForm.start || !leaveForm.end) return 0
    return Math.round((new Date(leaveForm.end).getTime() - new Date(leaveForm.start).getTime()) / 86400000) + 1
  }

  return (
    <div className="space-y-6">
      {payrollToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />Payroll run initiated for June 2026.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit flex-wrap">
        {([['attendance', 'Attendance'], ['leave', 'Leave Requests'], ['payroll', 'Payroll & Payslips']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
            {l}
            {v === 'leave' && pendingCount > 0 && isManager && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Attendance tab ── */}
      {tab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <StatCard label="Days Present" value={present} icon={CheckCircle}  accent="bg-emerald-50" />
            <StatCard label="Days Absent"  value={absent}  icon={XCircle}      accent="bg-red-50" />
            <StatCard label="On Leave"     value={onLeave} icon={Calendar}     accent="bg-blue-50" />
            <StatCard label="Partial Days" value={partial} icon={AlertCircle}  accent="bg-amber-50" />
          </div>

          {/* Today widget */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-navy/50 mb-1">
                Today — {new Date(TODAY + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-navy">{todayRec?.clock_in ?? '--:--'}</p>
                {todayRec?.clock_out
                  ? <><span className="text-navy/30">→</span><p className="text-2xl font-bold text-navy">{todayRec.clock_out}</p></>
                  : todayRec?.clock_in && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Clocked In</span>
                }
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary"><Clock className="w-4 h-4" />Clock In</button>
              <button className="btn-secondary"><Clock className="w-4 h-4" />Clock Out</button>
            </div>
          </div>

          {/* Calendar */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy">June 2026 Attendance</h3>
              <div className="flex items-center gap-1.5 text-xs text-navy/50">
                <span className="w-3 h-3 rounded-sm border-2 border-navy inline-block" />Today
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_HEADERS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-navy/40 py-1">{d}</div>
              ))}
              {Array.from({ length: FIRST_DOW }).map((_, i) => <div key={`off-${i}`} />)}
              {Array.from({ length: DAYS_IN_MONTH }).map((_, i) => {
                const day  = i + 1
                const date = dayDate(day)
                const rec  = recordMap[date]
                const isToday   = date === TODAY
                const weekend   = isWeekend(day)
                const base      = `rounded-lg p-1.5 text-center border transition-colors ${isToday ? 'ring-2 ring-navy ring-offset-1' : ''}`

                if (rec) return (
                  <div key={date} className={`${base} ${STATUS_STYLE[rec.status]}`}
                    title={[rec.clock_in, rec.clock_out].filter(Boolean).join(' – ')}>
                    <p className="text-xs font-bold">{day}</p>
                    {rec.clock_in && <p className="text-[9px] opacity-70">{rec.clock_in}</p>}
                  </div>
                )
                if (weekend) return (
                  <div key={date} className={`${base} bg-gray-50 border-gray-100`}>
                    <p className="text-xs text-navy/20">{day}</p>
                  </div>
                )
                return (
                  <div key={date} className={`${base} bg-white border-border`}>
                    <p className="text-xs text-navy/40">{day}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border">
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-navy/60">
                  <span className={`w-3 h-3 rounded-sm border ${v}`} />
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Leave tab ── */}
      {tab === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
              {isManager ? 'All Leave Requests' : 'My Leave Requests'}
            </p>
            <button onClick={() => setLeaveModal(true)} className="btn-primary text-sm">
              <Calendar className="w-4 h-4" />Request Leave
            </button>
          </div>

          {isManager && pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{pendingCount} pending request{pendingCount > 1 ? 's' : ''} awaiting approval</p>
                <p className="text-xs text-amber-700 mt-0.5">Review each request below and approve or reject.</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {leaves.map(l => (
              <div key={l.leave_id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {l.editor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{l.editor_name}</p>
                      <p className="text-xs text-navy/50 capitalize">{l.leave_type} · {formatDate(l.start_date)} – {formatDate(l.end_date)}</p>
                      <p className="text-xs text-navy/40 mt-0.5">Submitted {formatDate(l.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={l.status} />
                    {isManager && l.status === 'pending' && (
                      <>
                        <button onClick={() => approveLeave(l.leave_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />Approve
                        </button>
                        <button onClick={() => rejectLeave(l.leave_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors">
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payroll tab ── */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          {(isManager || isFinance) && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">June 2026 Payroll</p>
              <button onClick={handleRunPayroll} className="btn-primary text-sm">
                <Play className="w-3.5 h-3.5" />Run Payroll
              </button>
            </div>
          )}

          {mockPayslips.map(ps => (
            <div key={ps.payslip_id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {ps.editor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{ps.editor_name}</p>
                    <p className="text-sm text-navy/50">{formatDate(ps.period_start)} – {formatDate(ps.period_end)}</p>
                  </div>
                </div>
                <StatusBadge status={ps.status} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  {[
                    { label: 'Base Salary',          value: formatCurrency(ps.base_salary),            color: 'text-navy' },
                    { label: 'Project Bonus',         value: `+${formatCurrency(ps.project_bonus)}`,   color: 'text-emerald-600' },
                    { label: 'Attendance Deduction',  value: `-${formatCurrency(ps.attendance_deduction)}`, color: ps.attendance_deduction > 0 ? 'text-red-600' : 'text-navy/40' },
                    { label: 'Reimbursement',         value: formatCurrency(ps.reimbursement_total),   color: 'text-navy' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-1 border-b border-border last:border-0">
                      <span className="text-sm text-navy/60">{row.label}</span>
                      <span className={`text-sm font-medium ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center bg-navy rounded-2xl p-6">
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-1">Net Salary</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(ps.net_salary)}</p>
                  </div>
                </div>
              </div>

              {/* Component bar */}
              <div className="mb-3">
                <div className="flex h-2 rounded-full overflow-hidden gap-px">
                  <div className="bg-navy" style={{ width: `${(ps.base_salary / ps.net_salary) * 100}%` }} />
                  <div className="bg-emerald-400" style={{ width: `${(ps.project_bonus / ps.net_salary) * 100}%` }} />
                  {ps.attendance_deduction > 0 && (
                    <div className="bg-red-400" style={{ width: `${(ps.attendance_deduction / ps.net_salary) * 100}%` }} />
                  )}
                </div>
                <div className="flex gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-navy/50"><span className="w-2 h-2 rounded-sm bg-navy inline-block" />Base</span>
                  <span className="flex items-center gap-1 text-xs text-navy/50"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Bonus</span>
                  {ps.attendance_deduction > 0 && <span className="flex items-center gap-1 text-xs text-navy/50"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Deduction</span>}
                </div>
              </div>

              <button className="btn-secondary w-full justify-center">
                <FileText className="w-4 h-4" />Download Payslip PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Leave request modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Request Leave">
        <div className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <div className="grid grid-cols-2 gap-2">
              {([['cuti', 'Cuti Tahunan', 'Annual leave entitlement'], ['izin', 'Izin / Sakit', 'Permission or sick day']] as const).map(([v, l, d]) => (
                <button key={v} onClick={() => setLeaveForm(f => ({ ...f, type: v }))}
                  className={`p-3 rounded-xl border text-left transition-all ${leaveForm.type === v ? 'border-navy bg-navy/5' : 'border-border'}`}>
                  <p className={`text-sm font-semibold ${leaveForm.type === v ? 'text-navy' : 'text-navy/60'}`}>{l}</p>
                  <p className="text-xs text-navy/40 mt-0.5">{d}</p>
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
          {leaveDuration() > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
              Duration: <span className="font-semibold">{leaveDuration()} day{leaveDuration() > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setLeaveModal(false)} className="btn-secondary">Cancel</button>
            <button
              disabled={!leaveForm.start || !leaveForm.end || leaveDuration() <= 0}
              onClick={() => setLeaveModal(false)}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <Calendar className="w-4 h-4" />Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
