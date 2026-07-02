import { useState, useMemo } from 'react'
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck,
  XCircle,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import type { UserRole } from '../../types'

type ReconciliationStatus = 'balanced' | 'discrepancy' | 'pending'

interface DailyTransaction {
  transaction_id: string
  type: 'dp_payment' | 'final_payment' | 'escrow_release' | 'refund' | 'major_topup'
  project_title: string
  amount: number
  timestamp: string
}

interface ReconciliationEntry {
  date: string
  opening_balance: number
  total_inflow: number
  total_outflow: number
  closing_balance: number
  expected_balance: number
  discrepancy: number
  status: ReconciliationStatus
  transactions: DailyTransaction[]
  reconciled_at?: string
  reconciled_by?: string
}

function generateReconciliationData(): ReconciliationEntry[] {
  const entries: ReconciliationEntry[] = [
    {
      date: '2026-06-30',
      opening_balance: 12500000,
      total_inflow: 4800000,
      total_outflow: 2000000,
      closing_balance: 15300000,
      expected_balance: 15300000,
      discrepancy: 0,
      status: 'pending',
      transactions: [
        { transaction_id: 't101', type: 'dp_payment', project_title: 'Brand Refresh - TechCo', amount: 2500000, timestamp: '2026-06-30T09:15:00' },
        { transaction_id: 't102', type: 'dp_payment', project_title: 'Product Photography Set', amount: 1800000, timestamp: '2026-06-30T11:30:00' },
        { transaction_id: 't103', type: 'final_payment', project_title: 'E-commerce Catalog', amount: 500000, timestamp: '2026-06-30T14:00:00' },
        { transaction_id: 't104', type: 'escrow_release', project_title: 'Wedding Video Edit', amount: 2000000, timestamp: '2026-06-30T16:45:00' },
      ],
    },
    {
      date: '2026-06-29',
      opening_balance: 10800000,
      total_inflow: 3200000,
      total_outflow: 1500000,
      closing_balance: 12500000,
      expected_balance: 12500000,
      discrepancy: 0,
      status: 'balanced',
      transactions: [
        { transaction_id: 't201', type: 'dp_payment', project_title: 'Corporate Headshots', amount: 1500000, timestamp: '2026-06-29T10:00:00' },
        { transaction_id: 't202', type: 'final_payment', project_title: 'Menu Design Package', amount: 1700000, timestamp: '2026-06-29T13:30:00' },
        { transaction_id: 't203', type: 'escrow_release', project_title: 'Fashion Lookbook', amount: 1500000, timestamp: '2026-06-29T17:00:00' },
      ],
      reconciled_at: '2026-06-30T08:00:00',
      reconciled_by: 'Fani Finance',
    },
    {
      date: '2026-06-28',
      opening_balance: 9200000,
      total_inflow: 2800000,
      total_outflow: 1200000,
      closing_balance: 10800000,
      expected_balance: 10800000,
      discrepancy: 0,
      status: 'balanced',
      transactions: [
        { transaction_id: 't301', type: 'dp_payment', project_title: 'Social Media Content', amount: 1200000, timestamp: '2026-06-28T09:30:00' },
        { transaction_id: 't302', type: 'dp_payment', project_title: 'Product Video Ads', amount: 1600000, timestamp: '2026-06-28T14:15:00' },
        { transaction_id: 't303', type: 'escrow_release', project_title: 'Portrait Session', amount: 1200000, timestamp: '2026-06-28T16:30:00' },
      ],
      reconciled_at: '2026-06-29T08:15:00',
      reconciled_by: 'Fani Finance',
    },
    {
      date: '2026-06-27',
      opening_balance: 11500000,
      total_inflow: 1500000,
      total_outflow: 3750000,
      closing_balance: 9250000,
      expected_balance: 9200000,
      discrepancy: 50000,
      status: 'discrepancy',
      transactions: [
        { transaction_id: 't401', type: 'dp_payment', project_title: 'Event Coverage', amount: 1500000, timestamp: '2026-06-27T10:00:00' },
        { transaction_id: 't402', type: 'escrow_release', project_title: 'Corporate Video', amount: 2500000, timestamp: '2026-06-27T14:00:00' },
        { transaction_id: 't403', type: 'refund', project_title: 'Cancelled Photoshoot', amount: 1250000, timestamp: '2026-06-27T15:30:00' },
      ],
      reconciled_at: '2026-06-28T08:30:00',
      reconciled_by: 'Fani Finance',
    },
    {
      date: '2026-06-26',
      opening_balance: 8700000,
      total_inflow: 4300000,
      total_outflow: 1500000,
      closing_balance: 11500000,
      expected_balance: 11500000,
      discrepancy: 0,
      status: 'balanced',
      transactions: [
        { transaction_id: 't501', type: 'dp_payment', project_title: 'Real Estate Photography', amount: 2000000, timestamp: '2026-06-26T09:00:00' },
        { transaction_id: 't502', type: 'dp_payment', project_title: 'Food Photography', amount: 1300000, timestamp: '2026-06-26T11:00:00' },
        { transaction_id: 't503', type: 'final_payment', project_title: 'Jewelry Catalog', amount: 1000000, timestamp: '2026-06-26T14:30:00' },
        { transaction_id: 't504', type: 'escrow_release', project_title: 'Music Video Edit', amount: 1500000, timestamp: '2026-06-26T17:00:00' },
      ],
      reconciled_at: '2026-06-27T08:00:00',
      reconciled_by: 'Fani Finance',
    },
    {
      date: '2026-06-25',
      opening_balance: 7200000,
      total_inflow: 2500000,
      total_outflow: 1000000,
      closing_balance: 8700000,
      expected_balance: 8700000,
      discrepancy: 0,
      status: 'balanced',
      transactions: [
        { transaction_id: 't601', type: 'dp_payment', project_title: 'Interior Design Shots', amount: 1500000, timestamp: '2026-06-25T10:30:00' },
        { transaction_id: 't602', type: 'final_payment', project_title: 'Product Retouch Batch', amount: 1000000, timestamp: '2026-06-25T13:00:00' },
        { transaction_id: 't603', type: 'escrow_release', project_title: 'Documentary Edit', amount: 1000000, timestamp: '2026-06-25T16:00:00' },
      ],
      reconciled_at: '2026-06-26T08:00:00',
      reconciled_by: 'Fani Finance',
    },
  ]

  return entries
}

const TRANSACTION_TYPE_CONFIG: Record<string, { label: string; icon: typeof ArrowUpRight; color: string; isInflow: boolean }> = {
  dp_payment: { label: 'Pembayaran DP', icon: ArrowUpRight, color: 'text-emerald-600', isInflow: true },
  final_payment: { label: 'Pembayaran Akhir', icon: ArrowUpRight, color: 'text-emerald-600', isInflow: true },
  major_topup: { label: 'Top-up Revisi', icon: ArrowUpRight, color: 'text-blue-600', isInflow: true },
  escrow_release: { label: 'Pencairan', icon: ArrowDownLeft, color: 'text-navy', isInflow: false },
  refund: { label: 'Pengembalian', icon: ArrowDownLeft, color: 'text-red-600', isInflow: false },
}

const STATUS_CONFIG: Record<ReconciliationStatus, { label: string; variant: 'green' | 'red' | 'yellow'; icon: typeof CheckCircle2 }> = {
  balanced: { label: 'Seimbang', variant: 'green', icon: CheckCircle2 },
  discrepancy: { label: 'Selisih', variant: 'red', icon: AlertTriangle },
  pending: { label: 'Belum Rekonsiliasi', variant: 'yellow', icon: Clock },
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Finansial', title: 'Rekonsiliasi Escrow', description: 'Bandingkan saldo escrow harian dengan agregat transaksi untuk memastikan akurasi.' },
  hr_admin: { eyebrow: 'Finansial', title: 'Rekonsiliasi', description: '' },
  admin_manager: { eyebrow: 'Finansial', title: 'Rekonsiliasi', description: '' },
  editor: { eyebrow: 'Finansial', title: 'Rekonsiliasi', description: '' },
  client: { eyebrow: 'Finansial', title: 'Rekonsiliasi', description: '' },
  mediator: { eyebrow: 'Finansial', title: 'Rekonsiliasi', description: '' },
  finance: { eyebrow: 'Operasi Keuangan', title: 'Rekonsiliasi Harian', description: 'Verifikasi saldo escrow harian. Deteksi dan investigasi selisih sebelum pelaporan.' },
}

export default function ReconciliationPage({ role }: { role: UserRole }) {
  const [entries, setEntries] = useState<ReconciliationEntry[]>(() => generateReconciliationData())
  const [selectedEntry, setSelectedEntry] = useState<ReconciliationEntry | null>(null)
  const [isReconciling, setIsReconciling] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const todayEntry = entries[0]
    const todayBalance = todayEntry?.closing_balance ?? 0

    const monthDiscrepancies = entries
      .filter(e => e.status === 'discrepancy')
      .reduce((sum, e) => sum + Math.abs(e.discrepancy), 0)

    const lastReconciled = entries.find(e => e.reconciled_at)
    const pendingCount = entries.filter(e => e.status === 'pending').length

    const reconStatus = pendingCount > 0 ? 'Perlu Rekonsiliasi' : 'Semua Seimbang'

    return {
      todayBalance,
      monthDiscrepancies,
      lastReconciled: lastReconciled?.reconciled_at,
      reconStatus,
      pendingCount,
    }
  }, [entries])

  const canAct = role === 'finance' || role === 'superadmin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleRunReconciliation() {
    setIsReconciling(true)

    setTimeout(() => {
      setEntries(prev =>
        prev.map(entry =>
          entry.status === 'pending'
            ? {
                ...entry,
                status: 'balanced' as ReconciliationStatus,
                reconciled_at: new Date().toISOString(),
                reconciled_by: 'Fani Finance',
              }
            : entry
        )
      )
      setIsReconciling(false)
      showToast('Rekonsiliasi selesai. Semua entri hari ini telah diverifikasi.')
    }, 2000)
  }

  function handleMarkResolved(date: string) {
    setEntries(prev =>
      prev.map(entry =>
        entry.date === date
          ? {
              ...entry,
              status: 'balanced' as ReconciliationStatus,
              discrepancy: 0,
              expected_balance: entry.closing_balance,
            }
          : entry
      )
    )
    setSelectedEntry(null)
    showToast('Selisih ditandai sebagai diselesaikan.')
  }

  function closeModal() {
    setSelectedEntry(null)
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
          label="Saldo Hari Ini"
          value={formatCurrency(stats.todayBalance)}
          icon={Scale}
          accent="bg-blue-50"
          change="Saldo penutupan"
        />
        <StatCard
          label="Total Selisih Bulan Ini"
          value={formatCurrency(stats.monthDiscrepancies)}
          icon={AlertTriangle}
          accent={stats.monthDiscrepancies > 0 ? 'bg-red-50' : 'bg-emerald-50'}
          change={stats.monthDiscrepancies > 0 ? 'Perlu investigasi' : 'Tidak ada selisih'}
          changeType={stats.monthDiscrepancies > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="Terakhir Rekonsiliasi"
          value={stats.lastReconciled ? formatDate(stats.lastReconciled) : '-'}
          icon={Clock}
          accent="bg-navy/5"
          change={stats.lastReconciled ? formatDateTime(stats.lastReconciled).split(',')[1]?.trim() : 'Belum ada'}
        />
        <StatCard
          label="Status Rekonsiliasi"
          value={stats.pendingCount > 0 ? `${stats.pendingCount} Pending` : 'OK'}
          icon={FileCheck}
          accent={stats.pendingCount > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
          change={stats.reconStatus}
          changeType={stats.pendingCount > 0 ? 'neutral' : 'up'}
        />
      </div>

      {canAct && stats.pendingCount > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <RefreshCw className={`w-5 h-5 text-amber-600 shrink-0 mt-0.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <div>
              <p className="text-sm font-semibold text-amber-800">Rekonsiliasi Diperlukan</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Ada {stats.pendingCount} entri yang belum direkonsiliasi. Jalankan rekonsiliasi untuk memverifikasi saldo.
              </p>
            </div>
          </div>
          <button
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className={`btn-primary whitespace-nowrap ${isReconciling ? 'opacity-70 cursor-wait' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
            {isReconciling ? 'Memproses...' : 'Jalankan Rekonsiliasi'}
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Ledger Rekonsiliasi Harian</h3>
          <p className="text-xs text-navy/50">{entries.length} hari terakhir</p>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th className="text-right">Saldo Awal</th>
                <th className="text-right">Inflow</th>
                <th className="text-right">Outflow</th>
                <th className="text-right">Saldo Akhir</th>
                <th className="text-right">Ekspektasi</th>
                <th className="text-right">Selisih</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const statusConfig = STATUS_CONFIG[entry.status]
                const StatusIcon = statusConfig.icon
                const hasDiscrepancy = entry.discrepancy !== 0

                return (
                  <tr key={entry.date}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-navy/40" />
                        <span className="text-sm font-medium text-navy">{formatDate(entry.date)}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium text-navy/70 whitespace-nowrap">
                      {formatCurrency(entry.opening_balance)}
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-medium text-emerald-600 flex items-center justify-end gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {formatCurrency(entry.total_inflow)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-medium text-red-600 flex items-center justify-end gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {formatCurrency(entry.total_outflow)}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-navy whitespace-nowrap">
                      {formatCurrency(entry.closing_balance)}
                    </td>
                    <td className="text-right text-navy/60 whitespace-nowrap">
                      {formatCurrency(entry.expected_balance)}
                    </td>
                    <td className="text-right">
                      <span className={`text-sm font-semibold ${hasDiscrepancy ? 'text-red-600' : 'text-emerald-600'}`}>
                        {hasDiscrepancy ? formatCurrency(entry.discrepancy) : '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`w-3.5 h-3.5 ${
                          entry.status === 'balanced' ? 'text-emerald-500' :
                          entry.status === 'discrepancy' ? 'text-red-500' : 'text-amber-500'
                        }`} />
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="text-xs text-navy/60 hover:text-navy underline"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedEntry}
        onClose={closeModal}
        title={`Detail Rekonsiliasi - ${selectedEntry ? formatDate(selectedEntry.date) : ''}`}
      >
        {selectedEntry && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-navy/40" />
                <span className="font-semibold text-navy">{formatDate(selectedEntry.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const StatusIcon = STATUS_CONFIG[selectedEntry.status].icon
                  return (
                    <>
                      <StatusIcon className={`w-4 h-4 ${
                        selectedEntry.status === 'balanced' ? 'text-emerald-500' :
                        selectedEntry.status === 'discrepancy' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <Badge variant={STATUS_CONFIG[selectedEntry.status].variant}>
                        {STATUS_CONFIG[selectedEntry.status].label}
                      </Badge>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy/5 rounded-xl p-3 text-center">
                <p className="text-xs text-navy/50 mb-1">Saldo Awal</p>
                <p className="text-base font-bold text-navy">{formatCurrency(selectedEntry.opening_balance)}</p>
              </div>
              <div className="bg-navy/5 rounded-xl p-3 text-center">
                <p className="text-xs text-navy/50 mb-1">Saldo Akhir</p>
                <p className="text-base font-bold text-navy">{formatCurrency(selectedEntry.closing_balance)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 mb-1">Total Inflow</p>
                <p className="text-base font-bold text-emerald-700">{formatCurrency(selectedEntry.total_inflow)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 mb-1">Total Outflow</p>
                <p className="text-base font-bold text-red-700">{formatCurrency(selectedEntry.total_outflow)}</p>
              </div>
            </div>

            {selectedEntry.discrepancy !== 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Terdeteksi Selisih</p>
                  <p className="text-xs text-red-700 mt-1">
                    Terdapat selisih sebesar <strong>{formatCurrency(Math.abs(selectedEntry.discrepancy))}</strong> antara saldo akhir aktual dan ekspektasi.
                    Investigasi diperlukan.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">
                Transaksi ({selectedEntry.transactions.length})
              </p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {selectedEntry.transactions.map(tx => {
                  const config = TRANSACTION_TYPE_CONFIG[tx.type]
                  const Icon = config.icon

                  return (
                    <div key={tx.transaction_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        config.isInflow ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{tx.project_title}</p>
                        <p className="text-xs text-navy/50">{config.label} · {formatDateTime(tx.timestamp).split(',')[1]?.trim()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${config.isInflow ? 'text-emerald-600' : 'text-red-600'}`}>
                          {config.isInflow ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedEntry.reconciled_at && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-700">
                    Direkonsiliasi oleh <strong>{selectedEntry.reconciled_by}</strong> pada {formatDateTime(selectedEntry.reconciled_at)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={closeModal} className="btn-secondary">
                Tutup
              </button>
              {canAct && selectedEntry.status === 'discrepancy' && (
                <button
                  onClick={() => handleMarkResolved(selectedEntry.date)}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Diselesaikan
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
