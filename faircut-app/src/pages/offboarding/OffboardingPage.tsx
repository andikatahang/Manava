import { useState } from 'react'
import { UserX, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Briefcase, FileText, Shield, Archive } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'
import { mockEditors } from '../../data/mockData'

interface OffboardingCase {
  id: string
  editor_id: string
  editor_name: string
  department: string
  reason: 'resignation' | 'termination' | 'contract_end'
  effective_date: string
  initiated_at: string
  phase: 0 | 1 | 2 | 3 | 4
}

const PHASES = [
  { label: 'Trigger & Notify', icon: AlertTriangle, desc: 'HR notified, editor receives offboarding letter' },
  { label: 'Project Handoff', icon: Briefcase, desc: 'Active projects reassigned to available editors' },
  { label: 'Final Payroll', icon: FileText, desc: 'Pro-rated salary, bonuses, and deductions settled' },
  { label: 'Data Anonymization', icon: Archive, desc: 'PII anonymized 90 days post-offboarding per policy' },
]

const REASON_LABELS: Record<string, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  contract_end: 'Contract End',
}

const mockCases: OffboardingCase[] = [
  { id: 'ob1', editor_id: 'e5', editor_name: 'Rizky Hakim', department: 'Video Editing', reason: 'termination', effective_date: '2026-07-15', initiated_at: '2026-06-20', phase: 2 },
]

export default function OffboardingPage() {
  const [showForm, setShowForm] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [expandedCase, setExpandedCase] = useState<string | null>('ob1')
  const [form, setForm] = useState({ editor_id: '', reason: 'resignation', effective_date: '' })

  const selectedEditor = mockEditors.find(e => e.editor_id === form.editor_id)

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-amber-600">{mockCases.filter(c => c.phase < 4).length}</p>
          <p className="text-xs text-navy/60 mt-0.5">Active Offboardings</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-600">0</p>
          <p className="text-xs text-navy/60 mt-0.5">Completed This Month</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-navy">1</p>
          <p className="text-xs text-navy/60 mt-0.5">Pending Anonymization</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Initiate form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                  <UserX className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-navy">Initiate Offboarding</p>
                  <p className="text-xs text-navy/50">Select editor and trigger reason</p>
                </div>
              </div>
              {showForm ? <ChevronUp className="w-4 h-4 text-navy/40" /> : <ChevronDown className="w-4 h-4 text-navy/40" />}
            </button>

            {showForm && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div>
                  <label className="label">Editor</label>
                  <select
                    value={form.editor_id}
                    onChange={e => setForm(f => ({ ...f, editor_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select editor…</option>
                    {mockEditors.map(e => (
                      <option key={e.editor_id} value={e.editor_id}>{e.full_name} — {e.department}</option>
                    ))}
                  </select>
                </div>

                {selectedEditor && (
                  <div className="flex items-center gap-3 bg-navy-50/50 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-xl bg-navy text-white text-sm font-bold flex items-center justify-center">
                      {selectedEditor.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{selectedEditor.full_name}</p>
                      <p className="text-xs text-navy/50">{selectedEditor.department} · {selectedEditor.active_projects} active project(s)</p>
                    </div>
                    <StatusBadge status={selectedEditor.status} />
                  </div>
                )}

                <div>
                  <label className="label">Reason</label>
                  <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input">
                    <option value="resignation">Resignation</option>
                    <option value="termination">Termination</option>
                    <option value="contract_end">Contract End</option>
                  </select>
                </div>

                <div>
                  <label className="label">Effective Date</label>
                  <input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} className="input" />
                </div>

                {form.editor_id && form.effective_date && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    This will lock the editor's account and begin the 4-phase offboarding workflow. Active projects will be flagged for reassignment.
                  </div>
                )}

                <button
                  disabled={!form.editor_id || !form.effective_date}
                  onClick={() => setConfirmModal(true)}
                  className="btn-danger w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserX className="w-4 h-4" /> Initiate Offboarding
                </button>
              </div>
            )}
          </div>

          {/* 4-phase legend */}
          <div className="card">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Workflow Phases</p>
            <div className="space-y-3">
              {PHASES.map((p, i) => (
                <div key={p.label} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-navy/10 text-navy/60 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-navy">{p.label}</p>
                    <p className="text-xs text-navy/50">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-navy/40 mt-3 border-t border-border pt-3">Data anonymization runs 90 days post-offboarding per PDPA guidelines.</p>
          </div>
        </div>

        {/* Active cases */}
        <div className="lg:col-span-3 space-y-4">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Active Cases</p>
          {mockCases.length === 0 && (
            <div className="card text-center py-12 text-navy/30">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active offboardings</p>
            </div>
          )}
          {mockCases.map(c => {
            const isExpanded = expandedCase === c.id
            return (
              <div key={c.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-navy-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {c.editor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{c.editor_name}</p>
                      <p className="text-xs text-navy/50">{c.department} · {REASON_LABELS[c.reason]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-navy/40">Effective</p>
                      <p className="text-xs font-semibold text-navy">{formatDate(c.effective_date)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-navy/40" /> : <ChevronDown className="w-4 h-4 text-navy/40" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border">
                    {/* Phase progress */}
                    <div className="mt-4 space-y-2">
                      {PHASES.map((phase, i) => {
                        const done = i < c.phase
                        const active = i === c.phase
                        return (
                          <div key={phase.label} className={`flex items-center gap-4 p-3 rounded-xl ${done ? 'bg-emerald-50' : active ? 'bg-navy-50 border border-navy/15' : 'bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : active ? 'bg-navy' : 'bg-gray-200'}`}>
                              {done
                                ? <CheckCircle2 className="w-4 h-4 text-white" />
                                : active
                                ? <Clock className="w-4 h-4 text-white" />
                                : <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${done ? 'text-emerald-700' : active ? 'text-navy' : 'text-navy/40'}`}>{phase.label}</p>
                              <p className={`text-xs mt-0.5 ${done ? 'text-emerald-600' : 'text-navy/40'}`}>{phase.desc}</p>
                            </div>
                            <StatusBadge status={done ? 'completed' : active ? 'in_progress' : 'pending'} />
                          </div>
                        )
                      })}
                    </div>

                    {/* Action for current phase */}
                    {c.phase < 4 && (
                      <div className="flex justify-end mt-4">
                        <button className="btn-primary text-sm py-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Phase {c.phase + 1} Complete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm modal */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Offboarding">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-xs text-red-700 mt-1">
                Initiating offboarding will immediately lock the editor's account, flag their active projects for reassignment, and begin the 4-phase offboarding workflow.
              </p>
            </div>
          </div>
          {selectedEditor && (
            <div className="space-y-2 text-sm">
              {[
                ['Editor', selectedEditor.full_name],
                ['Department', selectedEditor.department],
                ['Reason', REASON_LABELS[form.reason]],
                ['Effective Date', form.effective_date ? formatDate(form.effective_date) : '—'],
                ['Active Projects', String(selectedEditor.active_projects)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{l}</span>
                  <span className="font-medium text-navy">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => setConfirmModal(false)} className="btn-danger">
              <UserX className="w-4 h-4" /> Confirm Offboarding
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
