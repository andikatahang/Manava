import { useState, useMemo } from 'react'
import {
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Play,
  Shield,
  XCircle,
  RefreshCw,
  Building2,
  CreditCard,
  FileCheck,
  AlertOctagon,
  Ban,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import { mockEditors } from '../../data/mockData'
import type { UserRole } from '../../types'

type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected'
type ExecutionStatus = 'not_started' | 'processing' | 'completed' | 'partially_failed'
type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed'

interface EditorPayment {
  editor_id: string
  editor_name: string
  editor_avatar?: string
  bank_name: string
  account_number: string
  base_salary: number
  bonus: number
  deductions: number
  net_amount: number
  payment_status: PaymentStatus
  processed_at?: string
  failure_reason?: string
}

interface PayrollBatch {
  batch_id: string
  batch_reference: string
  period: string
  period_label: string
  total_editors: number
  total_amount: number
  approval_status: ApprovalStatus
  approved_by?: string
  approved_at?: string
  execution_status: ExecutionStatus
  executed_by?: string
  executed_at?: string
  created_at: string
  editors: EditorPayment[]
  idempotency_key: string
}

function generateBankAccount(): { bank: string; account: string } {
  const banks = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga']
  const bank = banks[Math.floor(Math.random() * banks.length)]
  const account = Math.floor(1000000000 + Math.random() * 9000000000).toString()
  return { bank, account }
}

function generatePayrollBatches(): PayrollBatch[] {
  const juneEditors: EditorPayment[] = mockEditors.filter(e => e.status === 'active').map(editor => {
    const { bank, account } = generateBankAccount()
    const bonus = Math.floor(Math.random() * 800000) + 200000
    const deductions = Math.floor(Math.random() * 300000)
    return {
      editor_id: editor.editor_id,
      editor_name: editor.full_name,
      editor_avatar: editor.avatar,
      bank_name: bank,
      account_number: account,
      base_salary: editor.base_salary,
      bonus,
      deductions,
      net_amount: editor.base_salary + bonus - deductions,
      payment_status: 'success' as PaymentStatus,
      processed_at: '2026-06-30T10:30:00',
    }
  })

  const julyEditors: EditorPayment[] = mockEditors.filter(e => e.status === 'active').map(editor => {
    const { bank, account } = generateBankAccount()
    const bonus = Math.floor(Math.random() * 800000) + 200000
    const deductions = Math.floor(Math.random() * 300000)
    return {
      editor_id: editor.editor_id,
      editor_name: editor.full_name,
      editor_avatar: editor.avatar,
      bank_name: bank,
      account_number: account,
      base_salary: editor.base_salary,
      bonus,
      deductions,
      net_amount: editor.base_salary + bonus - deductions,
      payment_status: 'pending' as PaymentStatus,
    }
  })

  const mayEditors: EditorPayment[] = mockEditors.filter(e => e.status === 'active').slice(0, 4).map((editor, idx) => {
    const { bank, account } = generateBankAccount()
    const bonus = Math.floor(Math.random() * 600000) + 200000
    const deductions = Math.floor(Math.random() * 200000)
    const status: PaymentStatus = idx === 2 ? 'failed' : 'success'
    return {
      editor_id: editor.editor_id,
      editor_name: editor.full_name,
      editor_avatar: editor.avatar,
      bank_name: bank,
      account_number: account,
      base_salary: editor.base_salary,
      bonus,
      deductions,
      net_amount: editor.base_salary + bonus - deductions,
      payment_status: status,
      processed_at: status === 'success' ? '2026-05-31T11:00:00' : undefined,
      failure_reason: status === 'failed' ? 'Rekening tidak ditemukan' : undefined,
    }
  })

  return [
    {
      batch_id: 'batch-003',
      batch_reference: 'PAY-2026-07-001',
      period: '2026-07',
      period_label: 'Juli 2026',
      total_editors: julyEditors.length,
      total_amount: julyEditors.reduce((s, e) => s + e.net_amount, 0),
      approval_status: 'pending_approval',
      execution_status: 'not_started',
      created_at: '2026-07-01T08:00:00',
      editors: julyEditors,
      idempotency_key: 'idem-2026-07-001',
    },
    {
      batch_id: 'batch-002',
      batch_reference: 'PAY-2026-06-001',
      period: '2026-06',
      period_label: 'Juni 2026',
      total_editors: juneEditors.length,
      total_amount: juneEditors.reduce((s, e) => s + e.net_amount, 0),
      approval_status: 'approved',
      approved_by: 'Hasna HR Admin',
      approved_at: '2026-06-29T14:00:00',
      execution_status: 'completed',
      executed_by: 'Ahmad Superadmin',
      executed_at: '2026-06-30T10:30:00',
      created_at: '2026-06-28T08:00:00',
      editors: juneEditors,
      idempotency_key: 'idem-2026-06-001',
    },
    {
      batch_id: 'batch-001',
      batch_reference: 'PAY-2026-05-001',
      period: '2026-05',
      period_label: 'Mei 2026',
      total_editors: mayEditors.length,
      total_amount: mayEditors.reduce((s, e) => s + e.net_amount, 0),
      approval_status: 'approved',
      approved_by: 'Hasna HR Admin',
      approved_at: '2026-05-29T15:00:00',
      execution_status: 'partially_failed',
      executed_by: 'Ahmad Superadmin',
      executed_at: '2026-05-31T11:00:00',
      created_at: '2026-05-28T08:00:00',
      editors: mayEditors,
      idempotency_key: 'idem-2026-05-001',
    },
  ]
}

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'yellow' | 'green' | 'red'; icon: typeof Clock }> = {
  pending_approval: { label: 'Menunggu Persetujuan', variant: 'yellow', icon: Clock },
  approved: { label: 'Disetujui', variant: 'green', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', variant: 'red', icon: XCircle },
}

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red'; icon: typeof Clock }> = {
  not_started: { label: 'Belum Dieksekusi', variant: 'gray', icon: Clock },
  processing: { label: 'Sedang Diproses', variant: 'blue', icon: RefreshCw },
  completed: { label: 'Selesai', variant: 'green', icon: CheckCircle2 },
  partially_failed: { label: 'Sebagian Gagal', variant: 'red', icon: AlertTriangle },
}

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: 'yellow' | 'blue' | 'green' | 'red' }> = {
  pending: { label: 'Menunggu', variant: 'yellow' },
  processing: { label: 'Diproses', variant: 'blue' },
  success: { label: 'Berhasil', variant: 'green' },
  failed: { label: 'Gagal', variant: 'red' },
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Finansial', title: 'Disbursement Payroll', description: 'Eksekusi pembayaran gaji editor secara batch. Validasi idempotent mencegah duplikasi.' },
  hr_admin: { eyebrow: 'Payroll', title: 'Disbursement Batch', description: 'Setujui dan pantau eksekusi pembayaran gaji editor.' },
  admin_manager: { eyebrow: 'Payroll', title: 'Disbursement', description: '' },
  editor: { eyebrow: 'Payroll', title: 'Disbursement', description: '' },
  client: { eyebrow: 'Payroll', title: 'Disbursement', description: '' },
  mediator: { eyebrow: 'Payroll', title: 'Disbursement', description: '' },
  finance: { eyebrow: 'Operasi Keuangan', title: 'Disbursement Payroll', description: 'Eksekusi batch payroll dengan validasi idempotent.' },
}

export default function PayrollDisbursementPage({ role }: { role: UserRole }) {
  const [batches, setBatches] = useState<PayrollBatch[]>(() => generatePayrollBatches())
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null)
  const [executeModal, setExecuteModal] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const totalBatches = batches.length
    const pendingApproval = batches.filter(b => b.approval_status === 'pending_approval').length
    const totalDisbursed = batches
      .filter(b => b.execution_status === 'completed' || b.execution_status === 'partially_failed')
      .reduce((sum, b) => sum + b.editors.filter(e => e.payment_status === 'success').reduce((s, e) => s + e.net_amount, 0), 0)
    const failedCount = batches.reduce((sum, b) =>
      sum + b.editors.filter(e => e.payment_status === 'failed').length, 0)

    return { totalBatches, pendingApproval, totalDisbursed, failedCount }
  }, [batches])

  const canApprove = role === 'hr_admin' || role === 'superadmin'
  const canExecute = role === 'superadmin' || role === 'finance'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleApprove(batchId: string) {
    setBatches(prev =>
      prev.map(b =>
        b.batch_id === batchId
          ? {
              ...b,
              approval_status: 'approved' as ApprovalStatus,
              approved_by: 'Hasna HR Admin',
              approved_at: new Date().toISOString(),
            }
          : b
      )
    )
    showToast('Batch payroll disetujui. Siap untuk dieksekusi.')
  }

  function handleExecute() {
    if (!selectedBatch) return

    const isAlreadyProcessed = selectedBatch.execution_status === 'completed' ||
                                selectedBatch.execution_status === 'partially_failed'

    if (isAlreadyProcessed) {
      showToast(`Batch ${selectedBatch.batch_reference} sudah diproses. Duplikasi dicegah.`)
      setExecuteModal(false)
      return
    }

    setIsExecuting(true)

    setTimeout(() => {
      setBatches(prev =>
        prev.map(b =>
          b.batch_id === selectedBatch.batch_id
            ? {
                ...b,
                execution_status: 'completed' as ExecutionStatus,
                executed_by: 'Ahmad Superadmin',
                executed_at: new Date().toISOString(),
                editors: b.editors.map(e => ({
                  ...e,
                  payment_status: 'success' as PaymentStatus,
                  processed_at: new Date().toISOString(),
                })),
              }
            : b
        )
      )
      setIsExecuting(false)
      setExecuteModal(false)
      setSelectedBatch(null)
      showToast(`Batch ${selectedBatch.batch_reference} berhasil dieksekusi. ${selectedBatch.total_editors} transfer selesai.`)
    }, 2500)
  }

  function handleRetry(batchId: string, editorId: string) {
    setBatches(prev =>
      prev.map(b =>
        b.batch_id === batchId
          ? {
              ...b,
              editors: b.editors.map(e =>
                e.editor_id === editorId
                  ? { ...e, payment_status: 'success' as PaymentStatus, processed_at: new Date().toISOString(), failure_reason: undefined }
                  : e
              ),
              execution_status: b.editors.filter(e => e.editor_id !== editorId).every(e => e.payment_status === 'success')
                ? 'completed' as ExecutionStatus
                : b.execution_status,
            }
          : b
      )
    )
    showToast('Pembayaran berhasil diproses ulang.')
  }

  function closeModal() {
    setSelectedBatch(null)
    setExecuteModal(false)
  }

  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.superadmin

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={h.eyebrow} title={h.title} description={h.description} role={role} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Batch Bulan Ini"
          value={stats.totalBatches}
          icon={FileCheck}
          accent="bg-blue-50"
          change="Batch payroll"
        />
        <StatCard
          label="Menunggu Persetujuan"
          value={stats.pendingApproval}
          icon={Clock}
          accent="bg-amber-50"
          change={stats.pendingApproval > 0 ? 'Perlu tindakan' : 'Semua disetujui'}
        />
        <StatCard
          label="Total Dicairkan"
          value={formatCurrency(stats.totalDisbursed)}
          icon={Banknote}
          accent="bg-emerald-50"
          change="Sukses transfer"
          changeType="up"
        />
        <StatCard
          label="Gagal Perlu Retry"
          value={stats.failedCount}
          icon={AlertOctagon}
          accent={stats.failedCount > 0 ? 'bg-red-50' : 'bg-emerald-50'}
          change={stats.failedCount > 0 ? 'Perlu perhatian' : 'Tidak ada'}
          changeType={stats.failedCount > 0 ? 'down' : 'up'}
        />
      </div>

      <div className="card p-4 bg-navy/5 border-navy/10">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-navy/60 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Validasi Idempotent</p>
            <p className="text-xs text-navy/60 mt-1">
              Setiap batch memiliki <strong>reference number</strong> dan <strong>idempotency key</strong> unik.
              Sistem mencegah duplikasi eksekusi untuk melindungi dari pembayaran ganda.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Batch Payroll</h3>
          <p className="text-xs text-navy/50">{batches.length} batch</p>
        </div>

        <div className="space-y-4">
          {batches.map(batch => {
            const approvalConfig = APPROVAL_STATUS_CONFIG[batch.approval_status]
            const executionConfig = EXECUTION_STATUS_CONFIG[batch.execution_status]
            const ApprovalIcon = approvalConfig.icon
            const ExecutionIcon = executionConfig.icon
            const isProcessed = batch.execution_status === 'completed' || batch.execution_status === 'partially_failed'
            const canExecuteBatch = batch.approval_status === 'approved' && !isProcessed

            return (
              <div
                key={batch.batch_id}
                className={`border rounded-xl p-5 ${
                  isProcessed ? 'bg-gray-50 border-gray-200' : 'bg-white border-border hover:border-navy/20'
                } transition-colors`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-mono text-sm font-semibold text-navy bg-navy/5 px-2 py-0.5 rounded">
                        {batch.batch_reference}
                      </span>
                      <span className="text-sm font-medium text-navy">{batch.period_label}</span>
                      {isProcessed && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" />
                          Sudah Diproses
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {batch.total_editors} editor
                      </span>
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3 h-3" />
                        {formatCurrency(batch.total_amount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Dibuat {formatDate(batch.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <ApprovalIcon className={`w-3.5 h-3.5 ${
                        batch.approval_status === 'approved' ? 'text-emerald-500' :
                        batch.approval_status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <Badge variant={approvalConfig.variant}>{approvalConfig.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ExecutionIcon className={`w-3.5 h-3.5 ${
                        batch.execution_status === 'completed' ? 'text-emerald-500' :
                        batch.execution_status === 'partially_failed' ? 'text-red-500' :
                        batch.execution_status === 'processing' ? 'text-blue-500 animate-spin' : 'text-gray-400'
                      }`} />
                      <Badge variant={executionConfig.variant}>{executionConfig.label}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBatch(batch)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Detail
                    </button>
                    {canApprove && batch.approval_status === 'pending_approval' && (
                      <button
                        onClick={() => handleApprove(batch.batch_id)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Setujui
                      </button>
                    )}
                    {canExecute && canExecuteBatch && (
                      <button
                        onClick={() => {
                          setSelectedBatch(batch)
                          setExecuteModal(true)
                        }}
                        className="btn-primary text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Eksekusi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={!!selectedBatch && !executeModal}
        onClose={closeModal}
        title={`Detail Batch - ${selectedBatch?.batch_reference ?? ''}`}
      >
        {selectedBatch && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy/5 rounded-xl p-3">
                <p className="text-xs text-navy/50 mb-1">Periode</p>
                <p className="text-sm font-semibold text-navy">{selectedBatch.period_label}</p>
              </div>
              <div className="bg-navy/5 rounded-xl p-3">
                <p className="text-xs text-navy/50 mb-1">Total Amount</p>
                <p className="text-sm font-semibold text-navy">{formatCurrency(selectedBatch.total_amount)}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <strong>Idempotency Key:</strong>
                <span className="font-mono">{selectedBatch.idempotency_key}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-navy/50">Status Approval:</span>
                <Badge variant={APPROVAL_STATUS_CONFIG[selectedBatch.approval_status].variant}>
                  {APPROVAL_STATUS_CONFIG[selectedBatch.approval_status].label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-navy/50">Eksekusi:</span>
                <Badge variant={EXECUTION_STATUS_CONFIG[selectedBatch.execution_status].variant}>
                  {EXECUTION_STATUS_CONFIG[selectedBatch.execution_status].label}
                </Badge>
              </div>
            </div>

            {selectedBatch.approved_by && (
              <p className="text-xs text-navy/50">
                Disetujui oleh <strong>{selectedBatch.approved_by}</strong> pada {formatDateTime(selectedBatch.approved_at!)}
              </p>
            )}
            {selectedBatch.executed_by && (
              <p className="text-xs text-navy/50">
                Dieksekusi oleh <strong>{selectedBatch.executed_by}</strong> pada {formatDateTime(selectedBatch.executed_at!)}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">
                Daftar Editor ({selectedBatch.editors.length})
              </p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {selectedBatch.editors.map(editor => {
                  const statusConfig = PAYMENT_STATUS_CONFIG[editor.payment_status]

                  return (
                    <div key={editor.editor_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {editor.editor_avatar ? (
                        <img
                          src={editor.editor_avatar}
                          alt={editor.editor_name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-navy">{editor.editor_name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy">{editor.editor_name}</p>
                        <p className="text-xs text-navy/50 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {editor.bank_name} · {editor.account_number.slice(0, 4)}****{editor.account_number.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-navy">{formatCurrency(editor.net_amount)}</p>
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          {editor.payment_status === 'failed' && canExecute && (
                            <button
                              onClick={() => handleRetry(selectedBatch.batch_id, editor.editor_id)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedBatch.editors.some(e => e.payment_status === 'failed') && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <strong>{selectedBatch.editors.filter(e => e.payment_status === 'failed').length}</strong> pembayaran gagal. Periksa detail dan lakukan retry.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={closeModal} className="btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={executeModal}
        onClose={() => setExecuteModal(false)}
        title="Konfirmasi Eksekusi Payroll"
      >
        {selectedBatch && (
          <div className="space-y-5">
            {(selectedBatch.execution_status === 'completed' || selectedBatch.execution_status === 'partially_failed') ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <Ban className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Batch Sudah Diproses</p>
                  <p className="text-xs text-red-700 mt-1">
                    Batch <strong>{selectedBatch.batch_reference}</strong> sudah dieksekusi pada {formatDateTime(selectedBatch.executed_at!)}.
                    Validasi idempotent mencegah duplikasi pembayaran.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <Play className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Eksekusi Batch Payroll</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Dana akan ditransfer dari rekening perusahaan ke rekening masing-masing editor.
                      Proses ini tidak dapat dibatalkan setelah dimulai.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    ['Batch Reference', selectedBatch.batch_reference],
                    ['Periode', selectedBatch.period_label],
                    ['Total Editor', `${selectedBatch.total_editors} orang`],
                    ['Total Disbursement', formatCurrency(selectedBatch.total_amount)],
                    ['Idempotency Key', selectedBatch.idempotency_key],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-navy/60">{label}</span>
                      <span className="font-medium text-navy font-mono text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-navy/5 rounded-xl p-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-navy/60" />
                  <p className="text-xs text-navy/70">
                    Sumber: <strong>Rekening Operasional Manava</strong> (BCA ****4521)
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setExecuteModal(false)} className="btn-secondary">
                Batal
              </button>
              {!(selectedBatch.execution_status === 'completed' || selectedBatch.execution_status === 'partially_failed') && (
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className={`btn-primary bg-emerald-600 hover:bg-emerald-700 ${isExecuting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Eksekusi Sekarang
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
