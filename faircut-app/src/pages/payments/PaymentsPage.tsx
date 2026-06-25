import { useState } from 'react'
import { CreditCard, TrendingUp, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle2, AlertTriangle, Clock, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDateTime, formatDate } from '../../lib/utils'
import { mockEscrowAccounts, mockTransactions, mockProjects } from '../../data/mockData'
import type { UserRole } from '../../types'

type TxFilter = 'all' | 'dp_payment' | 'final_payment' | 'escrow_release' | 'refund'

const TYPE_META: Record<string, { label: string; icon: typeof ArrowUpRight; color: string }> = {
  dp_payment:     { label: 'DP Payment',    icon: ArrowUpRight,  color: 'text-emerald-600' },
  final_payment:  { label: 'Final Payment', icon: ArrowUpRight,  color: 'text-emerald-600' },
  major_topup:    { label: 'Top-up',        icon: ArrowUpRight,  color: 'text-blue-600' },
  escrow_hold:    { label: 'Escrow Hold',   icon: RefreshCw,     color: 'text-navy/60' },
  escrow_release: { label: 'Released',      icon: TrendingUp,    color: 'text-emerald-600' },
  refund:         { label: 'Refund',        icon: ArrowDownLeft, color: 'text-red-600' },
  payroll:        { label: 'Payroll',       icon: ArrowDownLeft, color: 'text-navy/60' },
}

const PIPELINE = [
  { label: 'DP 50%',    desc: 'Down payment received' },
  { label: 'Final 50%', desc: 'Delivery approved' },
  { label: 'Released',  desc: 'Transferred to company' },
]

const FILTER_TABS: { key: TxFilter; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'dp_payment',    label: 'DP' },
  { key: 'final_payment', label: 'Final' },
  { key: 'escrow_release',label: 'Released' },
  { key: 'refund',        label: 'Refund' },
]

const chartData = ['2026-05', '2026-06'].map(m => {
  const label = m === '2026-05' ? 'May' : 'Jun'
  const inflow = mockTransactions
    .filter(t => t.created_at.startsWith(m) && ['dp_payment','final_payment','major_topup'].includes(t.type) && t.status === 'success')
    .reduce((s, t) => s + t.amount, 0)
  const released = mockTransactions
    .filter(t => t.created_at.startsWith(m) && t.type === 'escrow_release' && t.status === 'success')
    .reduce((s, t) => s + t.amount, 0)
  return { month: label, inflow: inflow / 1_000_000, released: released / 1_000_000 }
})

function getPipelineStep(escrow: typeof mockEscrowAccounts[0]) {
  if (escrow.released_balance > 0) return 2
  if (escrow.held_balance > 0) return 1
  return 0
}

export default function PaymentsPage({ role }: { role: UserRole }) {
  const [selectedId, setSelectedId] = useState(mockEscrowAccounts[0].escrow_id)
  const [txFilter, setTxFilter] = useState<TxFilter>('all')
  const [releaseModal, setReleaseModal] = useState(false)
  const [refundModal, setRefundModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const selected = mockEscrowAccounts.find(e => e.escrow_id === selectedId)!
  const pipelineStep = getPipelineStep(selected)
  const allReleased = selected.released_balance > 0
  const projectStatus = mockProjects.find(p => p.project_id === selected.project_id)?.status

  const totalHeld     = mockEscrowAccounts.reduce((s, e) => s + e.held_balance, 0)
  const totalReleased = mockEscrowAccounts.reduce((s, e) => s + e.released_balance, 0)
  const totalRefunded = mockEscrowAccounts.reduce((s, e) => s + e.refunded_balance, 0)
  const totalVolume   = mockTransactions
    .filter(t => t.status === 'success' && ['dp_payment','final_payment'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0)

  const projectTxs  = mockTransactions.filter(t => t.project_id === selected.project_id)
  const filteredTxs = txFilter === 'all'
    ? [...mockTransactions].reverse()
    : [...mockTransactions].reverse().filter(t => t.type === txFilter)

  const canAct = role === 'finance' || role === 'superadmin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Held in Escrow"       value={formatCurrency(totalHeld)}     icon={CreditCard}  accent="bg-amber-50"   change="Across active projects" />
        <StatCard label="Released to Company"  value={formatCurrency(totalReleased)} icon={TrendingUp}  accent="bg-emerald-50" change="+8M this month" changeType="up" />
        <StatCard label="Total Refunded"       value={formatCurrency(totalRefunded)} icon={ArrowDownLeft} accent="bg-red-50" />
        <StatCard label="Total Volume"         value={formatCurrency(totalVolume)}   icon={BarChart2}   accent="bg-blue-50"    change="All time inflow" />
      </div>

      {/* Master-detail */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: accounts + chart */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Escrow Accounts</p>
          {mockEscrowAccounts.map(e => {
            const step = getPipelineStep(e)
            const active = e.escrow_id === selectedId
            return (
              <button key={e.escrow_id} onClick={() => setSelectedId(e.escrow_id)}
                className={`w-full text-left card p-4 transition-all ${active ? 'ring-2 ring-navy border-navy/30' : 'hover:border-navy/20'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${step === 2 ? 'bg-emerald-50' : step === 1 ? 'bg-amber-50' : 'bg-navy/5'}`}>
                    {step === 2
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : step === 1
                      ? <Clock className="w-4 h-4 text-amber-500" />
                      : <CreditCard className="w-4 h-4 text-navy/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{e.project_title}</p>
                    <p className="text-xs text-navy/50 mb-1.5">{e.client_name}</p>
                    <div className="flex flex-wrap gap-2">
                      {e.held_balance     > 0 && <span className="text-xs text-amber-600 font-medium">Held {formatCurrency(e.held_balance)}</span>}
                      {e.released_balance > 0 && <span className="text-xs text-emerald-600 font-medium">Released {formatCurrency(e.released_balance)}</span>}
                      {e.refunded_balance > 0 && <span className="text-xs text-red-500 font-medium">Refunded {formatCurrency(e.refunded_balance)}</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Revenue chart */}
          <div className="card mt-2">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Monthly Cash Flow (Rp M)</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} unit="M" />
                <Tooltip formatter={(v) => [`Rp ${Number(v).toFixed(1)}M`, '']} />
                <Bar dataKey="inflow"   fill="#10B981" radius={[4,4,0,0]} name="Inflow" />
                <Bar dataKey="released" fill="#1E3A5F" radius={[4,4,0,0]} name="Released" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-navy/60"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Inflow</div>
              <div className="flex items-center gap-1.5 text-xs text-navy/60"><span className="w-3 h-3 rounded-sm bg-navy inline-block" />Released</div>
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-navy">{selected.project_title}</p>
                <p className="text-xs text-navy/50">{selected.client_name} · Updated {formatDate(selected.updated_at)}</p>
              </div>
              {projectStatus && <StatusBadge status={projectStatus} />}
            </div>

            {/* Payment pipeline */}
            <div className="flex items-center gap-1.5 mb-5">
              {PIPELINE.map((step, i) => {
                const done   = allReleased || i < pipelineStep
                const cur    = !allReleased && i === pipelineStep
                return (
                  <div key={step.label} className="flex items-center gap-1.5 flex-1">
                    <div className={`flex-1 rounded-xl p-3 text-center border ${done ? 'bg-emerald-50 border-emerald-200' : cur ? 'bg-navy/5 border-navy/20' : 'bg-gray-50 border-gray-100'}`}>
                      <div className={`w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center ${done ? 'bg-emerald-500' : cur ? 'bg-navy' : 'bg-gray-200'}`}>
                        {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : cur ? <Clock className="w-3 h-3 text-white" /> : <span className="text-[9px] font-bold text-gray-400">{i+1}</span>}
                      </div>
                      <p className={`text-xs font-semibold ${done ? 'text-emerald-700' : cur ? 'text-navy' : 'text-navy/30'}`}>{step.label}</p>
                      <p className={`text-[10px] mt-0.5 ${done ? 'text-emerald-600' : 'text-navy/30'}`}>{step.desc}</p>
                    </div>
                    {i < PIPELINE.length - 1 && <ArrowUpRight className={`w-4 h-4 shrink-0 ${done ? 'text-emerald-400' : 'text-navy/20'}`} />}
                  </div>
                )
              })}
            </div>

            {/* Balance breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-700 mb-1">Held</p>
                <p className="text-base font-bold text-amber-700">{formatCurrency(selected.held_balance)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-700 mb-1">Released</p>
                <p className="text-base font-bold text-emerald-700">{formatCurrency(selected.released_balance)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 mb-1">Refunded</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(selected.refunded_balance)}</p>
              </div>
            </div>

            {/* Finance actions */}
            {canAct && selected.held_balance > 0 && (
              <div className="flex gap-2 pt-3 border-t border-border">
                {['in_review','completed'].includes(projectStatus ?? '') && (
                  <button onClick={() => setReleaseModal(true)} className="btn-primary flex-1 justify-center">
                    <TrendingUp className="w-4 h-4" />Release Escrow
                  </button>
                )}
                {projectStatus === 'disputed' && (
                  <button onClick={() => setRefundModal(true)} className="btn-danger flex-1 justify-center">
                    <ArrowDownLeft className="w-4 h-4" />Issue Refund
                  </button>
                )}
                {!['in_review','completed','disputed'].includes(projectStatus ?? '') && (
                  <p className="text-xs text-navy/40 italic">Actions available once project reaches review stage</p>
                )}
              </div>
            )}
          </div>

          {/* Project-level transactions */}
          <div className="card">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Project Transactions</p>
            {projectTxs.length === 0
              ? <p className="text-sm text-navy/30 text-center py-4">No transactions yet</p>
              : <div className="space-y-2">
                  {projectTxs.map(t => {
                    const meta = TYPE_META[t.type] ?? { label: t.type, icon: RefreshCw, color: 'text-navy/60' }
                    const Icon = meta.icon
                    return (
                      <div key={t.transaction_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center shrink-0">
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${meta.color}`}>{meta.label}</p>
                          <p className="text-xs text-navy/40">{formatDateTime(t.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-navy">{formatCurrency(t.amount)}</p>
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        </div>
      </div>

      {/* Transaction ledger */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-navy">Transaction Ledger</h3>
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map(f => (
              <button key={f.key} onClick={() => setTxFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${txFilter === f.key ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Type</th><th>Project</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {filteredTxs.map(t => {
                const meta = TYPE_META[t.type] ?? { label: t.type, icon: RefreshCw, color: 'text-navy/60' }
                const Icon = meta.icon
                return (
                  <tr key={t.transaction_id}>
                    <td><span className={`flex items-center gap-1.5 text-sm font-medium ${meta.color}`}><Icon className="w-3.5 h-3.5" />{meta.label}</span></td>
                    <td className="text-navy/70 max-w-[180px] truncate">{t.project_title}</td>
                    <td className="font-semibold text-navy">{formatCurrency(t.amount)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-navy/50 text-xs whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release modal */}
      <Modal open={releaseModal} onClose={() => setReleaseModal(false)} title="Release Escrow">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Confirm Escrow Release</p>
              <p className="text-xs text-emerald-700 mt-1">Funds will be transferred to the company account within 1 hour per SLA. This action is logged in the audit trail.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[['Project', selected.project_title], ['Client', selected.client_name], ['Amount', formatCurrency(selected.held_balance)], ['Target', 'FairCut Company IDR Account']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-navy/60">{l}</span><span className="font-medium text-navy">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setReleaseModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => { setReleaseModal(false); showToast('Escrow released. Funds transferred to company account.') }} className="btn-primary">
              <TrendingUp className="w-4 h-4" />Release
            </button>
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Issue Refund">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This will refund the client</p>
              <p className="text-xs text-red-700 mt-1">Held escrow balance will be returned to the client's original payment method. This action is logged and cannot be undone.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[['Project', selected.project_title], ['Client', selected.client_name], ['Refund Amount', formatCurrency(selected.held_balance)], ['Method', 'Original payment method']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-navy/60">{l}</span><span className="font-medium text-navy">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setRefundModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => { setRefundModal(false); showToast('Refund initiated. Client will receive funds within 1–3 business days.') }} className="btn-danger">
              <ArrowDownLeft className="w-4 h-4" />Issue Refund
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
