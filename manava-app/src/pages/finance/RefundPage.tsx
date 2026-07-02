import { useState, useMemo } from 'react'
import {
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Wallet,
  PiggyBank,
  RefreshCw,
  UserX,
  XCircle,
  FileText,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { UserRole } from '../../types'

type CancellationReason = 'editor_emergency_leave' | 'client_early_cancellation'
type RefundStatus = 'pending' | 'processing' | 'completed'

interface CancelledProject {
  refund_id: string
  project_id: string
  project_title: string
  client_id: string
  client_name: string
  editor_name: string
  dp_amount: number
  refund_amount: number
  retained_amount: number
  cancellation_reason: CancellationReason
  cancellation_note: string
  refund_status: RefundStatus
  cancelled_at: string
  processed_at?: string
}

const REFUND_RATE = 0.8
const RETENTION_RATE = 0.2

const CANCELLATION_REASON_CONFIG: Record<CancellationReason, { label: string; variant: 'yellow' | 'red'; icon: typeof UserX }> = {
  editor_emergency_leave: {
    label: 'Editor Cuti Darurat',
    variant: 'yellow',
    icon: UserX,
  },
  client_early_cancellation: {
    label: 'Pembatalan Dini Klien',
    variant: 'red',
    icon: XCircle,
  },
}

const REFUND_STATUS_CONFIG: Record<RefundStatus, { label: string; variant: 'yellow' | 'blue' | 'green' }> = {
  pending: { label: 'Menunggu', variant: 'yellow' },
  processing: { label: 'Diproses', variant: 'blue' },
  completed: { label: 'Selesai', variant: 'green' },
}

function generateMockCancelledProjects(): CancelledProject[] {
  const projects: CancelledProject[] = [
    {
      refund_id: 'ref1',
      project_id: 'p101',
      project_title: 'Brand Identity Package - StartupXYZ',
      client_id: 'c1',
      client_name: 'StartupXYZ',
      editor_name: 'Budi Santoso',
      dp_amount: 2500000,
      refund_amount: 2500000 * REFUND_RATE,
      retained_amount: 2500000 * RETENTION_RATE,
      cancellation_reason: 'client_early_cancellation',
      cancellation_note: 'Klien mengubah arah bisnis dan tidak lagi memerlukan layanan.',
      refund_status: 'pending',
      cancelled_at: '2026-06-28T10:00:00',
    },
    {
      refund_id: 'ref2',
      project_id: 'p102',
      project_title: 'E-commerce Product Shoot',
      client_id: 'c2',
      client_name: 'TokoMaju',
      editor_name: 'Sari Dewi',
      dp_amount: 1800000,
      refund_amount: 1800000 * REFUND_RATE,
      retained_amount: 1800000 * RETENTION_RATE,
      cancellation_reason: 'editor_emergency_leave',
      cancellation_note: 'Editor mengalami keadaan darurat keluarga dan tidak ada pengganti tersedia.',
      refund_status: 'pending',
      cancelled_at: '2026-06-27T14:30:00',
    },
    {
      refund_id: 'ref3',
      project_id: 'p103',
      project_title: 'Wedding Highlight Video',
      client_id: 'c3',
      client_name: 'Rina & Adi',
      editor_name: 'Maya Putri',
      dp_amount: 4000000,
      refund_amount: 4000000 * REFUND_RATE,
      retained_amount: 4000000 * RETENTION_RATE,
      cancellation_reason: 'client_early_cancellation',
      cancellation_note: 'Pernikahan ditunda ke tahun depan karena alasan pribadi.',
      refund_status: 'processing',
      cancelled_at: '2026-06-25T09:00:00',
    },
    {
      refund_id: 'ref4',
      project_id: 'p104',
      project_title: 'Corporate Video Annual Report',
      client_id: 'c4',
      client_name: 'PT Maju Bersama',
      editor_name: 'Andi Kurniawan',
      dp_amount: 6000000,
      refund_amount: 6000000 * REFUND_RATE,
      retained_amount: 6000000 * RETENTION_RATE,
      cancellation_reason: 'editor_emergency_leave',
      cancellation_note: 'Editor sakit dan perlu istirahat panjang. Proyek tidak bisa dilanjutkan tepat waktu.',
      refund_status: 'completed',
      cancelled_at: '2026-06-20T11:00:00',
      processed_at: '2026-06-22T15:30:00',
    },
    {
      refund_id: 'ref5',
      project_id: 'p105',
      project_title: 'Social Media Content Pack',
      client_id: 'c5',
      client_name: 'FashionHub ID',
      editor_name: 'Budi Santoso',
      dp_amount: 1200000,
      refund_amount: 1200000 * REFUND_RATE,
      retained_amount: 1200000 * RETENTION_RATE,
      cancellation_reason: 'client_early_cancellation',
      cancellation_note: 'Klien memutuskan untuk menggunakan tim internal.',
      refund_status: 'completed',
      cancelled_at: '2026-06-18T16:00:00',
      processed_at: '2026-06-19T10:00:00',
    },
  ]
  return projects
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Finansial', title: 'Pengembalian Dana', description: 'Kelola pengembalian dana untuk proyek yang dibatalkan. Kebijakan: 80% dikembalikan, 20% ditahan.' },
  hr_admin: { eyebrow: 'Finansial', title: 'Pengembalian Dana', description: 'Lihat status pengembalian dana proyek.' },
  admin_manager: { eyebrow: 'Finansial', title: 'Pengembalian Dana', description: 'Lihat status pengembalian dana proyek.' },
  editor: { eyebrow: 'Finansial', title: 'Pengembalian Dana', description: 'Lihat status pengembalian dana proyek.' },
  client: { eyebrow: 'Pembayaran', title: 'Pengembalian Dana', description: 'Status pengembalian dana untuk proyek Anda yang dibatalkan.' },
  mediator: { eyebrow: 'Finansial', title: 'Pengembalian Dana', description: 'Lihat status pengembalian dana proyek.' },
  finance: { eyebrow: 'Operasi Keuangan', title: 'Pengembalian Dana', description: 'Proses pengembalian dana untuk proyek yang dibatalkan. Kebijakan: 80% dikembalikan, 20% ditahan.' },
}

export default function RefundPage({ role }: { role: UserRole }) {
  const [projects, setProjects] = useState<CancelledProject[]>(() => generateMockCancelledProjects())
  const [selectedProject, setSelectedProject] = useState<CancelledProject | null>(null)
  const [processReason, setProcessReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const pending = projects.filter(p => p.refund_status === 'pending')
    const processing = projects.filter(p => p.refund_status === 'processing')
    const completed = projects.filter(p => p.refund_status === 'completed')

    const pendingAmount = pending.reduce((sum, p) => sum + p.refund_amount, 0)
    const totalRetained = projects.reduce((sum, p) => sum + p.retained_amount, 0)
    const totalRefunded = completed.reduce((sum, p) => sum + p.refund_amount, 0)

    return {
      pendingCount: pending.length + processing.length,
      pendingAmount,
      totalRetained,
      totalRefunded,
    }
  }, [projects])

  const canAct = role === 'finance' || role === 'superadmin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleProcessRefund() {
    if (!selectedProject) return

    setProjects(prev =>
      prev.map(p =>
        p.refund_id === selectedProject.refund_id
          ? { ...p, refund_status: 'processing' as RefundStatus }
          : p
      )
    )
    setSelectedProject(null)
    setProcessReason('')
    showToast(`Pengembalian dana untuk ${selectedProject.project_title} sedang diproses.`)
  }

  function handleCompleteRefund(refundId: string) {
    setProjects(prev =>
      prev.map(p =>
        p.refund_id === refundId
          ? { ...p, refund_status: 'completed' as RefundStatus, processed_at: new Date().toISOString() }
          : p
      )
    )
    showToast('Pengembalian dana berhasil diselesaikan.')
  }

  function closeModal() {
    setSelectedProject(null)
    setProcessReason('')
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
          label="Menunggu Proses"
          value={stats.pendingCount}
          icon={Clock}
          accent="bg-amber-50"
          change="Perlu ditindaklanjuti"
        />
        <StatCard
          label="Total Akan Dikembalikan"
          value={formatCurrency(stats.pendingAmount)}
          icon={ArrowDownLeft}
          accent="bg-blue-50"
          change="80% dari DP"
        />
        <StatCard
          label="Total Ditahan"
          value={formatCurrency(stats.totalRetained)}
          icon={PiggyBank}
          accent="bg-navy/5"
          change="20% retensi"
        />
        <StatCard
          label="Total Sudah Dikembalikan"
          value={formatCurrency(stats.totalRefunded)}
          icon={Wallet}
          accent="bg-emerald-50"
          change="Selesai diproses"
          changeType="up"
        />
      </div>

      <div className="card p-4 bg-navy/5 border-navy/10">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-navy/60 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Kebijakan Pengembalian Dana</p>
            <p className="text-xs text-navy/60 mt-1">
              Untuk proyek yang dibatalkan, klien menerima <strong>80%</strong> dari jumlah DP yang dibayarkan.
              Sisa <strong>20%</strong> ditahan untuk menutupi biaya administrasi dan waktu editor yang sudah dialokasikan.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Proyek Dibatalkan</h3>
          <p className="text-xs text-navy/50">{projects.length} proyek</p>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Proyek</th>
                <th>DP Dibayar</th>
                <th className="text-center">Dikembalikan (80%)</th>
                <th className="text-center">Ditahan (20%)</th>
                <th>Alasan Pembatalan</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const reasonConfig = CANCELLATION_REASON_CONFIG[project.cancellation_reason]
                const statusConfig = REFUND_STATUS_CONFIG[project.refund_status]
                const ReasonIcon = reasonConfig.icon

                return (
                  <tr key={project.refund_id}>
                    <td>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate max-w-[180px]">
                          {project.project_title}
                        </p>
                        <p className="text-xs text-navy/50">{project.client_name}</p>
                      </div>
                    </td>
                    <td className="font-semibold text-navy whitespace-nowrap">
                      {formatCurrency(project.dp_amount)}
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(project.refund_amount)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-medium text-navy/60">
                        {formatCurrency(project.retained_amount)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <ReasonIcon className={`w-3.5 h-3.5 ${reasonConfig.variant === 'yellow' ? 'text-amber-500' : 'text-red-500'}`} />
                        <Badge variant={reasonConfig.variant}>{reasonConfig.label}</Badge>
                      </div>
                    </td>
                    <td>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </td>
                    <td className="text-right">
                      {canAct && project.refund_status === 'pending' && (
                        <button
                          onClick={() => setSelectedProject(project)}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Proses
                        </button>
                      )}
                      {canAct && project.refund_status === 'processing' && (
                        <button
                          onClick={() => handleCompleteRefund(project.refund_id)}
                          className="btn-secondary text-xs px-3 py-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selesaikan
                        </button>
                      )}
                      {project.refund_status === 'completed' && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {project.processed_at ? formatDate(project.processed_at) : 'Selesai'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedProject}
        onClose={closeModal}
        title="Proses Pengembalian Dana"
      >
        {selectedProject && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <ArrowDownLeft className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Konfirmasi Pengembalian Dana</p>
                <p className="text-xs text-blue-700 mt-1">
                  Dana akan ditransfer ke metode pembayaran asli klien dalam 1-3 hari kerja. Aksi ini dicatat di audit log.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Proyek', selectedProject.project_title],
                ['Klien', selectedProject.client_name],
                ['Editor', selectedProject.editor_name],
                ['Tanggal Pembatalan', formatDate(selectedProject.cancelled_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{label}</span>
                  <span className="font-medium text-navy text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-navy/5 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Rincian Perhitungan</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-navy/50 mb-1">DP Dibayar</p>
                  <p className="text-base font-bold text-navy">{formatCurrency(selectedProject.dp_amount)}</p>
                </div>
                <div className="text-center bg-blue-50 rounded-lg py-2">
                  <p className="text-xs text-blue-600 mb-1">Dikembalikan (80%)</p>
                  <p className="text-base font-bold text-blue-700">{formatCurrency(selectedProject.refund_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-navy/50 mb-1">Ditahan (20%)</p>
                  <p className="text-base font-bold text-navy/70">{formatCurrency(selectedProject.retained_amount)}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-3 ${
              selectedProject.cancellation_reason === 'editor_emergency_leave'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {selectedProject.cancellation_reason === 'editor_emergency_leave' ? (
                  <UserX className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-semibold ${
                    selectedProject.cancellation_reason === 'editor_emergency_leave'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {CANCELLATION_REASON_CONFIG[selectedProject.cancellation_reason].label}
                  </p>
                  <p className={`text-xs mt-1 ${
                    selectedProject.cancellation_reason === 'editor_emergency_leave'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}>
                    {selectedProject.cancellation_note}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Catatan Proses (opsional)
              </label>
              <textarea
                value={processReason}
                onChange={e => setProcessReason(e.target.value)}
                placeholder="Tambahkan catatan untuk audit log..."
                className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/30"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeModal} className="btn-secondary">
                Batal
              </button>
              <button onClick={handleProcessRefund} className="btn-primary">
                <ArrowDownLeft className="w-4 h-4" />
                Proses Pengembalian
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
