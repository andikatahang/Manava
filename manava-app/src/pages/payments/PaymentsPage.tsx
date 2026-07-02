import { useState, useMemo, type ReactNode, type ComponentType } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CreditCard, TrendingUp, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, Lock, Send, FileText, Wallet, ChevronRight,
  Users,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import { mockEscrowAccounts, mockTransactions, mockProjects, mockPayslips, mockEditors } from '../../data/mockData'
import type { UserRole, EscrowAccount, Payslip, Transaction } from '../../types'
import { PageHeader } from '../../components/page/PageHeader'

// ----------------------------------------------------------------------------
// Config

type Tab = 'escrow' | 'payroll'

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin:    { eyebrow: 'Finansial',         title: 'Escrow & Payroll',          description: 'Pantau pergerakan escrow dan jalankan payroll bulanan. Aksi-aksi sensitif disimpan untuk jalur darurat.' },
  hr_admin:      { eyebrow: 'Payroll',           title: 'Payroll Run',               description: 'Jalankan payroll bulanan secara bertahap: tarik data → tinjau → finalisasi → publish ke ESS.' },
  finance:       { eyebrow: 'Operasi keuangan',  title: 'Escrow Ledger',             description: 'Rekonsiliasi escrow, eksekusi pencairan, dan tinjau riwayat transaksi.' },
  client:        { eyebrow: 'Pembayaran',        title: 'Escrow Saya',               description: 'Status DP, pelunasan, dan pencairan untuk proyek Anda.' },
  admin_manager: { eyebrow: 'Finansial',         title: 'Pembayaran',                description: 'Tinjauan saldo escrow proyek tim Anda.' },
  editor:        { eyebrow: 'Finansial',         title: 'Slip Gaji',                 description: 'Riwayat penggajian Anda tersedia di halaman Self-Service.' },
  mediator:      { eyebrow: 'Finansial',         title: 'Pembayaran',                description: 'Tinjauan saldo terkait sengketa aktif.' },
}

const TYPE_META: Record<Transaction['type'], { label: string; icon: ComponentType<{ className?: string }>; color: string }> = {
  dp_payment:     { label: 'Pembayaran DP',    icon: ArrowUpRight,  color: 'text-emerald-600' },
  final_payment:  { label: 'Pembayaran Akhir', icon: ArrowUpRight,  color: 'text-emerald-600' },
  major_topup:    { label: 'Top-up',           icon: ArrowUpRight,  color: 'text-blue-600'    },
  escrow_hold:    { label: 'Tahan Escrow',     icon: RefreshCw,     color: 'text-navy/60'     },
  escrow_release: { label: 'Dicairkan',        icon: TrendingUp,    color: 'text-emerald-600' },
  refund:         { label: 'Pengembalian',     icon: ArrowDownLeft, color: 'text-red-600'     },
  payroll:        { label: 'Penggajian',       icon: ArrowDownLeft, color: 'text-navy/60'     },
}

const PIPELINE: { label: string; desc: string }[] = [
  { label: 'DP 50%',    desc: 'Uang muka diterima' },
  { label: 'Final 50%', desc: 'Hasil disetujui' },
  { label: 'Dicairkan', desc: 'Ditransfer ke perusahaan' },
]

const PAYROLL_STEPS: { key: string; label: string; hint: string }[] = [
  { key: 'pull',     label: 'Tarik Data',  hint: 'Hitung gaji + bonus + potongan' },
  { key: 'review',   label: 'Tinjau',      hint: 'Verifikasi setiap baris' },
  { key: 'finalize', label: 'Finalisasi',  hint: 'Kunci angka, siap transfer' },
  { key: 'publish',  label: 'Publish',     hint: 'Rilis slip ke ESS editor' },
]

function getPipelineStep(escrow: EscrowAccount): number {
  if (escrow.released_balance > 0) return 2
  if (escrow.held_balance > 0) return 1
  return 0
}

// ----------------------------------------------------------------------------
// Tiny atoms

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{msg}
    </div>
  )
}

interface StatItem { label: string; value: string; sub?: string; tone?: 'navy' | 'emerald' | 'amber' | 'red' }
function StatStrip({ items }: { items: StatItem[] }) {
  const toneMap: Record<NonNullable<StatItem['tone']>, string> = {
    navy: 'text-navy', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600',
  }
  return (
    <div className="card p-0 divide-y sm:divide-y-0 sm:divide-x divide-border grid sm:grid-cols-4">
      {items.map(it => (
        <div key={it.label} className="px-5 py-4">
          <p className="text-[11px] font-semibold text-navy/45 uppercase tracking-wider">{it.label}</p>
          <p className={`text-lg font-bold mt-1 ${toneMap[it.tone ?? 'navy']}`}>{it.value}</p>
          {it.sub && <p className="text-xs text-navy/50 mt-0.5">{it.sub}</p>}
        </div>
      ))}
    </div>
  )
}

interface SignalProps { tone: 'navy' | 'emerald' | 'amber'; icon: ComponentType<{ className?: string }>; title: string; hint: string; action?: ReactNode }
function SignalCard({ tone, icon: Icon, title, hint, action }: SignalProps) {
  const styles: Record<SignalProps['tone'], string> = {
    navy:    'bg-navy text-white',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber:   'bg-amber-50 border-amber-200 text-amber-900',
  }
  const iconBg: Record<SignalProps['tone'], string> = {
    navy: 'bg-white/15', emerald: 'bg-white', amber: 'bg-white',
  }
  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${styles[tone]}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className={`text-xs mt-0.5 ${tone === 'navy' ? 'text-white/70' : 'opacity-75'}`}>{hint}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

interface TabBtnProps { active: boolean; onClick: () => void; children: ReactNode; badge?: number }
function TabBtn({ active, onClick, children, badge }: TabBtnProps) {
  return (
    <button onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${active ? 'border-navy text-navy' : 'border-transparent text-navy/50 hover:text-navy'}`}>
      {children}
      {badge != null && badge > 0 && (
        <span className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full ${active ? 'bg-navy text-white' : 'bg-navy/10 text-navy'}`}>{badge}</span>
      )}
    </button>
  )
}

// ----------------------------------------------------------------------------
// Escrow list row + drawer body

function EscrowRow({ escrow, status, onClick }: { escrow: EscrowAccount; status?: string; onClick: () => void }) {
  const step = getPipelineStep(escrow)
  return (
    <button onClick={onClick} className="w-full text-left card p-4 hover:border-navy/20 transition-all group">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${step === 2 ? 'bg-emerald-50' : step === 1 ? 'bg-amber-50' : 'bg-navy/5'}`}>
          {step === 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : step === 1 ? <Clock className="w-4 h-4 text-amber-500" /> : <CreditCard className="w-4 h-4 text-navy/40" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy truncate">{escrow.project_title}</p>
            {status && <StatusBadge status={status} />}
          </div>
          <p className="text-xs text-navy/50 mt-0.5">{escrow.client_name} · Diperbarui {formatDate(escrow.updated_at)}</p>
        </div>
        <div className="text-right shrink-0">
          {escrow.held_balance     > 0 && <p className="text-sm font-semibold text-amber-700">{formatCurrency(escrow.held_balance)}</p>}
          {escrow.released_balance > 0 && <p className="text-sm font-semibold text-emerald-700">{formatCurrency(escrow.released_balance)}</p>}
          {escrow.refunded_balance > 0 && <p className="text-sm font-semibold text-red-600">{formatCurrency(escrow.refunded_balance)}</p>}
          <p className="text-[10px] text-navy/40 uppercase tracking-wider mt-0.5">
            {escrow.held_balance > 0 ? 'Ditahan' : escrow.released_balance > 0 ? 'Dicairkan' : 'Dikembalikan'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-navy/30 group-hover:text-navy/60 shrink-0" />
      </div>
    </button>
  )
}

function EscrowDrawerBody({ escrow, projectStatus }: { escrow: EscrowAccount; projectStatus?: string }) {
  const step = getPipelineStep(escrow)
  const allReleased = escrow.released_balance > 0
  const txs = mockTransactions.filter(t => t.project_id === escrow.project_id)
  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <section>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Tahapan Pembayaran</p>
        <div className="flex items-center gap-1.5">
          {PIPELINE.map((s, i) => {
            const done = allReleased || i < step
            const cur  = !allReleased && i === step
            return (
              <div key={s.label} className="flex items-center gap-1.5 flex-1">
                <div className={`flex-1 rounded-xl p-3 text-center border ${done ? 'bg-emerald-50 border-emerald-200' : cur ? 'bg-navy/5 border-navy/20' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center ${done ? 'bg-emerald-500' : cur ? 'bg-navy' : 'bg-gray-200'}`}>
                    {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : cur ? <Clock className="w-3 h-3 text-white" /> : <span className="text-[9px] font-bold text-gray-400">{i+1}</span>}
                  </div>
                  <p className={`text-xs font-semibold ${done ? 'text-emerald-700' : cur ? 'text-navy' : 'text-navy/30'}`}>{s.label}</p>
                  <p className={`text-[10px] mt-0.5 ${done ? 'text-emerald-600' : 'text-navy/30'}`}>{s.desc}</p>
                </div>
                {i < PIPELINE.length - 1 && <ArrowUpRight className={`w-4 h-4 shrink-0 ${done ? 'text-emerald-400' : 'text-navy/20'}`} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* Balance breakdown */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-700 mb-1">Ditahan</p>
          <p className="text-base font-bold text-amber-700">{formatCurrency(escrow.held_balance)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-700 mb-1">Dicairkan</p>
          <p className="text-base font-bold text-emerald-700">{formatCurrency(escrow.released_balance)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 mb-1">Dikembalikan</p>
          <p className="text-base font-bold text-red-600">{formatCurrency(escrow.refunded_balance)}</p>
        </div>
      </section>

      {/* Project status hint */}
      {projectStatus && (
        <section className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <FileText className="w-4 h-4 text-navy/40 shrink-0" />
          <div className="flex-1 text-xs">
            <p className="text-navy/60">Status proyek</p>
            <p className="font-medium text-navy capitalize">{projectStatus.replace('_', ' ')}</p>
          </div>
          <StatusBadge status={projectStatus} />
        </section>
      )}

      {/* Project transactions */}
      <section>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Transaksi Proyek</p>
        {txs.length === 0
          ? <p className="text-sm text-navy/30 text-center py-4">Belum ada transaksi</p>
          : <div className="space-y-2">
              {txs.map(t => {
                const meta = TYPE_META[t.type]
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
      </section>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Payroll wizard

interface PayrollWizardProps {
  step: number
  onStep: (n: number) => void
  monthLabel: string
  payslips: Payslip[]
  onPickPayslip: (id: string) => void
  onPublish: () => void
  canEdit: boolean
}
function PayrollWizard({ step, onStep, monthLabel, payslips, onPickPayslip, onPublish, canEdit }: PayrollWizardProps) {
  const totalNet = payslips.reduce((s, p) => s + p.net_salary, 0)
  const finalized = payslips.every(p => p.status === 'finalized' || p.status === 'paid')
  const published = payslips.every(p => p.status === 'paid')

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Periode</p>
            <p className="text-base font-semibold text-navy mt-0.5">{monthLabel}</p>
          </div>
          <button className="btn-secondary text-xs" disabled>Ganti Periode</button>
        </div>
        <div className="flex items-center gap-1.5">
          {PAYROLL_STEPS.map((s, i) => {
            const done = i < step
            const cur  = i === step
            const clickable = canEdit && i <= step
            return (
              <div key={s.key} className="flex items-center gap-1.5 flex-1">
                <button
                  onClick={() => clickable && onStep(i)}
                  disabled={!clickable}
                  className={`flex-1 rounded-xl p-3 text-center border transition-colors text-left ${done ? 'bg-emerald-50 border-emerald-200' : cur ? 'bg-navy/5 border-navy/20' : 'bg-gray-50 border-gray-100'} ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : cur ? 'bg-navy' : 'bg-gray-200'}`}>
                      {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span className={`text-[9px] font-bold ${cur ? 'text-white' : 'text-gray-400'}`}>{i+1}</span>}
                    </div>
                    <p className={`text-xs font-semibold ${done ? 'text-emerald-700' : cur ? 'text-navy' : 'text-navy/30'}`}>{s.label}</p>
                  </div>
                  <p className={`text-[10px] mt-1 ${done ? 'text-emerald-600' : cur ? 'text-navy/60' : 'text-navy/30'}`}>{s.hint}</p>
                </button>
                {i < PAYROLL_STEPS.length - 1 && <ChevronRight className={`w-4 h-4 shrink-0 ${done ? 'text-emerald-400' : 'text-navy/20'}`} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step-specific body */}
      {step === 0 && (
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy/5 flex items-center justify-center"><Wallet className="w-5 h-5 text-navy/60" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">Tarik data untuk {monthLabel}</p>
            <p className="text-xs text-navy/50 mt-0.5">Mengumpulkan jam kerja, bonus proyek, dan potongan absensi untuk {payslips.length} editor.</p>
          </div>
          {canEdit && <button onClick={() => onStep(1)} className="btn-primary"><RefreshCw className="w-4 h-4" />Tarik Data</button>}
        </div>
      )}

      {(step === 1 || step === 2 || step === 3) && (
        <>
          {/* Summary band */}
          <div className="card">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-navy/50">Editor</p>
                <p className="text-lg font-bold text-navy">{payslips.length}</p>
              </div>
              <div>
                <p className="text-xs text-navy/50">Total Net</p>
                <p className="text-lg font-bold text-navy">{formatCurrency(totalNet)}</p>
              </div>
              <div>
                <p className="text-xs text-navy/50">Status</p>
                <p className="text-sm font-semibold text-navy mt-0.5">
                  {published ? 'Sudah dipublish' : finalized ? 'Siap publish' : 'Draft'}
                </p>
              </div>
            </div>
          </div>

          {/* Payslip list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider px-1">Slip Gaji</p>
            {payslips.map(p => <PayslipRow key={p.payslip_id} payslip={p} onClick={() => onPickPayslip(p.payslip_id)} />)}
          </div>

          {/* Step action footer */}
          {canEdit && step === 1 && (
            <div className="flex justify-end gap-2">
              <button onClick={() => onStep(0)} className="btn-secondary">Kembali</button>
              <button onClick={() => onStep(2)} className="btn-primary"><Lock className="w-4 h-4" />Finalisasi Angka</button>
            </div>
          )}
          {canEdit && step === 2 && (
            <div className="flex justify-end gap-2">
              <button onClick={() => onStep(1)} className="btn-secondary">Buka Kunci</button>
              <button onClick={onPublish} className="btn-primary"><Send className="w-4 h-4" />Publish ke ESS</button>
            </div>
          )}
          {step === 3 && (
            <div className="card bg-emerald-50 border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Slip gaji telah dipublish</p>
                <p className="text-xs text-emerald-700 mt-0.5">Editor dapat melihat slip mereka di halaman Self-Service.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PayslipRow({ payslip, onClick }: { payslip: Payslip; onClick: () => void }) {
  const editor = mockEditors.find(e => e.editor_id === payslip.editor_id)
  return (
    <button onClick={onClick} className="w-full text-left card p-4 hover:border-navy/20 transition-all group">
      <div className="flex items-center gap-4">
        {editor?.avatar
          ? <img src={editor.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-navy/40" /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy truncate">{payslip.editor_name}</p>
            <StatusBadge status={payslip.status} />
          </div>
          <p className="text-xs text-navy/50 mt-0.5">{editor?.department ?? 'Editor'} · Net {formatCurrency(payslip.net_salary)}</p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          {payslip.attendance_deduction > 0 && <p className="text-[11px] text-red-600">-{formatCurrency(payslip.attendance_deduction)}</p>}
          {payslip.project_bonus > 0       && <p className="text-[11px] text-emerald-600">+{formatCurrency(payslip.project_bonus)}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-navy/30 group-hover:text-navy/60 shrink-0" />
      </div>
    </button>
  )
}

function PayslipDrawerBody({ payslip }: { payslip: Payslip }) {
  const lines: { label: string; value: number; tone: 'navy' | 'red' | 'emerald' }[] = [
    { label: 'Gaji Pokok',       value:  payslip.base_salary,          tone: 'navy'    },
    { label: 'Potongan Absensi', value: -payslip.attendance_deduction, tone: 'red'     },
    { label: 'Bonus Proyek',     value:  payslip.project_bonus,        tone: 'emerald' },
    { label: 'Reimbursement',    value:  payslip.reimbursement_total,  tone: 'emerald' },
  ]
  const toneCls: Record<string, string> = { navy: 'text-navy', red: 'text-red-600', emerald: 'text-emerald-600' }

  return (
    <div className="space-y-5">
      <section className="bg-navy text-white rounded-2xl p-5">
        <p className="text-xs text-white/60 uppercase tracking-wider">Take-Home</p>
        <p className="text-2xl font-bold mt-1">{formatCurrency(payslip.net_salary)}</p>
        <p className="text-xs text-white/70 mt-1">{formatDate(payslip.period_start)} — {formatDate(payslip.period_end)}</p>
      </section>

      <section>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Rincian</p>
        <div className="card divide-y divide-border p-0">
          {lines.filter(l => l.value !== 0).map(l => (
            <div key={l.label} className="flex justify-between px-4 py-3">
              <span className="text-sm text-navy/70">{l.label}</span>
              <span className={`text-sm font-semibold ${toneCls[l.tone]}`}>
                {l.value < 0 ? '−' : ''}{formatCurrency(Math.abs(l.value))}
              </span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-gray-50">
            <span className="text-sm font-semibold text-navy">Take-home</span>
            <span className="text-sm font-bold text-navy">{formatCurrency(payslip.net_salary)}</span>
          </div>
        </div>
      </section>

      <section className="text-xs text-navy/50 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        Dihasilkan {formatDateTime(payslip.generated_at)}
      </section>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Main page

export default function PaymentsPage({ role }: { role: UserRole }) {
  const location = useLocation()
  const isPayrollRoute = location.pathname === '/payroll'
  // Finance reaches payroll only via /payroll; superadmin keeps both tabs on one page.
  const showPayrollTab = role === 'superadmin' || (role === 'finance' && isPayrollRoute)
  const showEscrowTab  = role !== 'editor' && !isPayrollRoute
  const defaultTab: Tab = isPayrollRoute ? 'payroll' : 'escrow'

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [selectedEscrowId,  setSelectedEscrowId]  = useState<string | null>(null)
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null)
  const [releaseModal, setReleaseModal] = useState(false)
  const [refundModal,  setRefundModal]  = useState(false)
  const [publishModal, setPublishModal] = useState(false)
  const [payrollStep, setPayrollStep] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Data slices
  const escrowList = mockEscrowAccounts
  const junePayslips = useMemo(() => mockPayslips.filter(p => p.period_start.startsWith('2026-06')), [])

  const selectedEscrow  = selectedEscrowId  ? escrowList.find(e => e.escrow_id === selectedEscrowId)  ?? null : null
  const selectedPayslip = selectedPayslipId ? junePayslips.find(p => p.payslip_id === selectedPayslipId) ?? null : null
  const projectStatusOf = (escrow: EscrowAccount) => mockProjects.find(p => p.project_id === escrow.project_id)?.status

  // Stats
  const totalHeld     = escrowList.reduce((s, e) => s + e.held_balance,     0)
  const totalReleased = escrowList.reduce((s, e) => s + e.released_balance, 0)
  const totalRefunded = escrowList.reduce((s, e) => s + e.refunded_balance, 0)
  const heldCount     = escrowList.filter(e => e.held_balance > 0).length
  const readyToRelease = escrowList.filter(e => {
    const ps = projectStatusOf(e)
    return e.held_balance > 0 && (ps === 'in_review' || ps === 'completed')
  })
  const pendingPayslips = junePayslips.filter(p => p.status !== 'paid')

  const canActFinance = role === 'finance' || role === 'superadmin'
  const canActPayroll = role === 'finance' || role === 'superadmin'

  // Header — payroll context overrides the role default
  const payrollHeader = { eyebrow: 'Payroll', title: 'Payroll Run', description: 'Jalankan payroll bulanan secara bertahap: tarik data → tinjau → finalisasi → publish ke ESS.' }
  const h = tab === 'payroll' ? payrollHeader : (HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.superadmin)

  // Stat strip per role
  const statItems: StatItem[] = tab === 'payroll'
    ? [
        { label: 'Editor',     value: String(junePayslips.length),                        sub: 'Periode aktif' },
        { label: 'Total Net',  value: formatCurrency(junePayslips.reduce((s, p) => s + p.net_salary, 0)) },
        { label: 'Belum Paid', value: String(pendingPayslips.length),                     tone: pendingPayslips.length > 0 ? 'amber' : 'emerald' },
        { label: 'Periode',    value: 'Juni 2026' },
      ]
    : [
        { label: 'Ditahan di Escrow',     value: formatCurrency(totalHeld),     sub: 'Lintas proyek aktif', tone: 'amber' },
        { label: 'Dicairkan ke Perusahaan', value: formatCurrency(totalReleased), sub: '+8M bulan ini',     tone: 'emerald' },
        { label: 'Dikembalikan',          value: formatCurrency(totalRefunded), tone: 'red' },
        { label: 'Proyek Aktif',          value: String(escrowList.length) },
      ]

  // Signal cards per role
  function renderSignal(): ReactNode {
    if (tab === 'payroll' && canActPayroll) {
      if (payrollStep === 3) return null
      return (
        <SignalCard
          tone="navy"
          icon={Send}
          title={`${pendingPayslips.length} slip gaji menunggu diproses`}
          hint="Selesaikan langkah saat ini untuk melanjutkan ke tahap berikutnya."
          action={
            payrollStep === 0
              ? <button onClick={() => setPayrollStep(1)} className="btn-secondary !bg-white !text-navy">Mulai</button>
              : payrollStep === 2
              ? <button onClick={() => setPublishModal(true)} className="btn-secondary !bg-white !text-navy">Publish</button>
              : null
          }
        />
      )
    }
    if (tab === 'escrow' && canActFinance && readyToRelease.length > 0) {
      return (
        <SignalCard
          tone="emerald"
          icon={TrendingUp}
          title={`${readyToRelease.length} escrow siap dicairkan`}
          hint="Proyek telah mencapai tahap tinjauan atau selesai."
          action={
            <button
              onClick={() => setSelectedEscrowId(readyToRelease[0].escrow_id)}
              className="btn-secondary !bg-white !text-emerald-700 !border-emerald-200">
              Tinjau
            </button>
          }
        />
      )
    }
    if (tab === 'escrow' && role === 'client' && heldCount > 0) {
      return (
        <SignalCard
          tone="amber"
          icon={Clock}
          title={`${heldCount} proyek dalam escrow`}
          hint="Dana ditahan aman sampai hasil disetujui."
        />
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={h.eyebrow} title={h.title} description={h.description} role={role} />
      {toast && <Toast msg={toast} />}

      {renderSignal()}

      <StatStrip items={statItems} />

      {/* Tabs (only when more than one tab visible) */}
      {showPayrollTab && showEscrowTab && (
        <div className="flex gap-1 border-b border-border">
          <TabBtn active={tab === 'escrow'} onClick={() => setTab('escrow')}>Escrow</TabBtn>
          <TabBtn active={tab === 'payroll'} onClick={() => setTab('payroll')} badge={pendingPayslips.length}>Payroll</TabBtn>
        </div>
      )}

      {/* Escrow tab */}
      {tab === 'escrow' && showEscrowTab && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Akun Escrow</p>
            <p className="text-xs text-navy/50">{escrowList.length} akun</p>
          </div>
          {escrowList.map(e => (
            <EscrowRow key={e.escrow_id} escrow={e} status={projectStatusOf(e)} onClick={() => setSelectedEscrowId(e.escrow_id)} />
          ))}
        </section>
      )}

      {/* Payroll tab */}
      {tab === 'payroll' && showPayrollTab && (
        <PayrollWizard
          step={payrollStep}
          onStep={setPayrollStep}
          monthLabel="Juni 2026"
          payslips={junePayslips}
          onPickPayslip={(id) => setSelectedPayslipId(id)}
          onPublish={() => setPublishModal(true)}
          canEdit={canActPayroll}
        />
      )}

      {/* Editor read-only fallback */}
      {role === 'editor' && (
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy/5 flex items-center justify-center"><FileText className="w-5 h-5 text-navy/60" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">Slip gaji Anda</p>
            <p className="text-xs text-navy/50 mt-0.5">Buka halaman Self-Service untuk melihat seluruh riwayat penggajian.</p>
          </div>
        </div>
      )}

      {/* Escrow drawer */}
      <Drawer
        open={!!selectedEscrow}
        onClose={() => setSelectedEscrowId(null)}
        title={selectedEscrow?.project_title ?? ''}
        subtitle={selectedEscrow ? `${selectedEscrow.client_name} · Escrow ${selectedEscrow.escrow_id}` : undefined}
        size="lg"
        footer={canActFinance && selectedEscrow && selectedEscrow.held_balance > 0 ? (
          <div className="flex justify-end gap-2">
            {['in_review','completed'].includes(projectStatusOf(selectedEscrow) ?? '') && (
              <button onClick={() => setReleaseModal(true)} className="btn-primary">
                <TrendingUp className="w-4 h-4" />Cairkan Escrow
              </button>
            )}
            {projectStatusOf(selectedEscrow) === 'disputed' && (
              <button onClick={() => setRefundModal(true)} className="btn-danger">
                <ArrowDownLeft className="w-4 h-4" />Terbitkan Pengembalian
              </button>
            )}
            {!['in_review','completed','disputed'].includes(projectStatusOf(selectedEscrow) ?? '') && (
              <p className="text-xs text-navy/40 italic">Aksi tersedia setelah proyek mencapai tahap tinjauan</p>
            )}
          </div>
        ) : undefined}
      >
        {selectedEscrow && <EscrowDrawerBody escrow={selectedEscrow} projectStatus={projectStatusOf(selectedEscrow)} />}
      </Drawer>

      {/* Payslip drawer */}
      <Drawer
        open={!!selectedPayslip}
        onClose={() => setSelectedPayslipId(null)}
        title={selectedPayslip?.editor_name ?? ''}
        subtitle={selectedPayslip ? `Slip ${selectedPayslip.payslip_id}` : undefined}
      >
        {selectedPayslip && <PayslipDrawerBody payslip={selectedPayslip} />}
      </Drawer>

      {/* Release modal */}
      <Modal open={releaseModal} onClose={() => setReleaseModal(false)} title="Cairkan Escrow">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Konfirmasi pencairan</p>
              <p className="text-xs text-emerald-700 mt-1">Dana ditransfer ke rekening perusahaan dalam 1 jam sesuai SLA. Tercatat di jejak audit.</p>
            </div>
          </div>
          {selectedEscrow && (
            <div className="space-y-2 text-sm">
              {[
                ['Proyek',  selectedEscrow.project_title],
                ['Klien',   selectedEscrow.client_name],
                ['Jumlah',  formatCurrency(selectedEscrow.held_balance)],
                ['Tujuan',  'Rekening IDR Perusahaan Manava'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{l}</span><span className="font-medium text-navy">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setReleaseModal(false)} className="btn-secondary">Batal</button>
            <button onClick={() => { setReleaseModal(false); setSelectedEscrowId(null); flash('Escrow dicairkan. Dana ditransfer.') }} className="btn-primary">
              <TrendingUp className="w-4 h-4" />Cairkan
            </button>
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Terbitkan Pengembalian">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Ini akan mengembalikan dana ke klien</p>
              <p className="text-xs text-red-700 mt-1">Saldo escrow akan dikembalikan ke metode pembayaran asli. Aksi ini tercatat dan tidak bisa dibatalkan.</p>
            </div>
          </div>
          {selectedEscrow && (
            <div className="space-y-2 text-sm">
              {[
                ['Proyek',  selectedEscrow.project_title],
                ['Klien',   selectedEscrow.client_name],
                ['Jumlah',  formatCurrency(selectedEscrow.held_balance)],
                ['Metode',  'Metode pembayaran asli'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{l}</span><span className="font-medium text-navy">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setRefundModal(false)} className="btn-secondary">Batal</button>
            <button onClick={() => { setRefundModal(false); setSelectedEscrowId(null); flash('Pengembalian dimulai. Klien menerima dana dalam 1–3 hari kerja.') }} className="btn-danger">
              <ArrowDownLeft className="w-4 h-4" />Terbitkan
            </button>
          </div>
        </div>
      </Modal>

      {/* Publish modal */}
      <Modal open={publishModal} onClose={() => setPublishModal(false)} title="Publish Slip Gaji">
        <div className="space-y-4">
          <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 flex gap-3">
            <Send className="w-5 h-5 text-navy shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-navy">Slip akan dirilis ke {junePayslips.length} editor</p>
              <p className="text-xs text-navy/60 mt-1">Editor menerima notifikasi di Self-Service. Setelah publish, angka tidak bisa diubah tanpa pencatatan adjustment.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPublishModal(false)} className="btn-secondary">Batal</button>
            <button onClick={() => { setPublishModal(false); setPayrollStep(3); flash('Slip gaji dipublish ke ESS editor.') }} className="btn-primary">
              <Send className="w-4 h-4" />Publish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
