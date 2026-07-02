import { useState } from 'react'
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowDownLeft,
  Eye,
  MoreHorizontal,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockEscrowAccounts, mockProjects, mockTransactions } from '../../data/mockData'
import type { UserRole, EscrowAccount, Project } from '../../types'

type EscrowPhase = 'awaiting_dp' | 'dp_received' | 'awaiting_final' | 'final_received' | 'released' | 'refunded'

interface EscrowProjectView extends EscrowAccount {
  project: Project
  phase: EscrowPhase
  dpStatus: 'pending' | 'paid' | 'n/a'
  finalStatus: 'pending' | 'paid' | 'n/a'
}

function derivePhase(escrow: EscrowAccount, project: Project): EscrowPhase {
  if (escrow.refunded_balance > 0 && escrow.held_balance === 0) return 'refunded'
  if (escrow.released_balance > 0 && escrow.held_balance === 0) return 'released'
  if (project.status === 'awaiting_dp') return 'awaiting_dp'
  const dpPaid = escrow.held_balance >= project.dp_amount || escrow.released_balance > 0
  const finalPaid = escrow.held_balance >= project.project_value || escrow.released_balance >= project.project_value
  if (finalPaid) return 'final_received'
  if (dpPaid && ['in_review', 'completed'].includes(project.status)) return 'awaiting_final'
  if (dpPaid) return 'dp_received'
  return 'awaiting_dp'
}

function getPhaseLabel(phase: EscrowPhase): string {
  const labels: Record<EscrowPhase, string> = {
    awaiting_dp: 'Menunggu DP',
    dp_received: 'DP Diterima',
    awaiting_final: 'Menunggu Pelunasan',
    final_received: 'Lunas',
    released: 'Dicairkan',
    refunded: 'Dikembalikan',
  }
  return labels[phase]
}

function getPhaseColor(phase: EscrowPhase): string {
  const colors: Record<EscrowPhase, string> = {
    awaiting_dp: 'bg-amber-50 text-amber-700 border-amber-200',
    dp_received: 'bg-blue-50 text-blue-700 border-blue-200',
    awaiting_final: 'bg-navy/5 text-navy border-navy/20',
    final_received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    released: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    refunded: 'bg-red-50 text-red-700 border-red-200',
  }
  return colors[phase]
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Finansial', title: 'Escrow Dual-Phase', description: 'Monitor status escrow seluruh proyek: DP 50% dan pelunasan 50%.' },
  hr_admin: { eyebrow: 'Finansial', title: 'Escrow Dual-Phase', description: 'Lihat status pembayaran proyek untuk rekonsiliasi payroll.' },
  admin_manager: { eyebrow: 'Finansial', title: 'Escrow Proyek', description: 'Pantau status pembayaran klien untuk proyek yang Anda kelola.' },
  editor: { eyebrow: 'Pembayaran', title: 'Status Escrow', description: 'Lihat status pembayaran untuk proyek-proyek Anda.' },
  client: { eyebrow: 'Pembayaran', title: 'Escrow Saya', description: 'Status DP dan pelunasan untuk proyek-proyek Anda.' },
  mediator: { eyebrow: 'Finansial', title: 'Escrow & Sengketa', description: 'Monitor escrow untuk proyek dalam mediasi.' },
  finance: { eyebrow: 'Operasi Keuangan', title: 'Escrow Dual-Phase', description: 'Kelola siklus escrow: DP, pelunasan, pencairan, dan pengembalian.' },
}

export default function EscrowPage({ role }: { role: UserRole }) {
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowProjectView | null>(null)
  const [releaseModal, setReleaseModal] = useState(false)
  const [refundModal, setRefundModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const escrowViews: EscrowProjectView[] = mockEscrowAccounts.map(escrow => {
    const project = mockProjects.find(p => p.project_id === escrow.project_id)!
    const phase = derivePhase(escrow, project)
    const dpPaid = escrow.held_balance > 0 || escrow.released_balance > 0
    const finalPaid = phase === 'final_received' || phase === 'released'
    return {
      ...escrow,
      project,
      phase,
      dpStatus: dpPaid ? 'paid' : project.status === 'awaiting_dp' ? 'pending' : 'n/a',
      finalStatus: finalPaid ? 'paid' : phase === 'awaiting_final' ? 'pending' : 'n/a',
    }
  })

  const totalHeld = mockEscrowAccounts.reduce((sum, e) => sum + e.held_balance, 0)
  const totalReleased = mockEscrowAccounts.reduce((sum, e) => sum + e.released_balance, 0)
  const awaitingDP = escrowViews.filter(e => e.phase === 'awaiting_dp').length
  const awaitingFinal = escrowViews.filter(e => e.phase === 'awaiting_final' || e.phase === 'dp_received').length

  const canAct = role === 'finance' || role === 'superadmin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleRelease() {
    setReleaseModal(false)
    setSelectedEscrow(null)
    showToast('Escrow dicairkan. Dana ditransfer ke rekening perusahaan.')
  }

  function handleRefund() {
    setRefundModal(false)
    setSelectedEscrow(null)
    showToast('Pengembalian dimulai. Dana dikembalikan ke klien dalam 1-3 hari kerja.')
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
          label="Total Ditahan"
          value={formatCurrency(totalHeld)}
          icon={Wallet}
          accent="bg-amber-50"
          change="Saldo escrow aktif"
        />
        <StatCard
          label="Total Dicairkan"
          value={formatCurrency(totalReleased)}
          icon={TrendingUp}
          accent="bg-emerald-50"
          change="+8M bulan ini"
          changeType="up"
        />
        <StatCard
          label="Menunggu DP"
          value={awaitingDP}
          icon={Clock}
          accent="bg-navy/5"
          change="Proyek pending"
        />
        <StatCard
          label="Menunggu Pelunasan"
          value={awaitingFinal}
          icon={AlertTriangle}
          accent="bg-blue-50"
          change="Siap dilunasi"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Daftar Escrow Proyek</h3>
          <p className="text-xs text-navy/50">{escrowViews.length} proyek</p>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Proyek</th>
                <th>Nilai Total</th>
                <th className="text-center">DP 50%</th>
                <th className="text-center">Pelunasan 50%</th>
                <th>Status Escrow</th>
                <th>Saldo Ditahan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {escrowViews.map(ev => (
                <tr key={ev.escrow_id}>
                  <td>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate max-w-[200px]">{ev.project_title}</p>
                      <p className="text-xs text-navy/50">{ev.client_name}</p>
                    </div>
                  </td>
                  <td className="font-semibold text-navy whitespace-nowrap">
                    {formatCurrency(ev.project.project_value)}
                  </td>
                  <td className="text-center">
                    <PaymentPhaseIndicator
                      amount={ev.project.dp_amount}
                      status={ev.dpStatus}
                      label="DP"
                    />
                  </td>
                  <td className="text-center">
                    <PaymentPhaseIndicator
                      amount={ev.project.final_amount}
                      status={ev.finalStatus}
                      label="Final"
                    />
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPhaseColor(ev.phase)}`}>
                      {getPhaseLabel(ev.phase)}
                    </span>
                  </td>
                  <td className="font-semibold text-amber-600 whitespace-nowrap">
                    {ev.held_balance > 0 ? formatCurrency(ev.held_balance) : '-'}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedEscrow(ev)}
                        className="p-2 rounded-lg hover:bg-navy/5 transition-colors"
                        title="Lihat detail"
                      >
                        <Eye className="w-4 h-4 text-navy/60" />
                      </button>
                      {canAct && ev.held_balance > 0 && (
                        <button
                          onClick={() => setSelectedEscrow(ev)}
                          className="p-2 rounded-lg hover:bg-navy/5 transition-colors"
                          title="Opsi lainnya"
                        >
                          <MoreHorizontal className="w-4 h-4 text-navy/60" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedEscrow && !releaseModal && !refundModal}
        onClose={() => setSelectedEscrow(null)}
        title="Detail Escrow"
      >
        {selectedEscrow && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-navy">{selectedEscrow.project_title}</p>
              <p className="text-xs text-navy/50 mt-0.5">{selectedEscrow.client_name} · Diperbarui {formatDate(selectedEscrow.updated_at)}</p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={selectedEscrow.project.status} />
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPhaseColor(selectedEscrow.phase)}`}>
                {getPhaseLabel(selectedEscrow.phase)}
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Rincian Pembayaran</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-700 mb-1">DP 50%</p>
                  <p className="text-base font-bold text-blue-700">{formatCurrency(selectedEscrow.project.dp_amount)}</p>
                  <PaymentStatusBadge status={selectedEscrow.dpStatus} />
                </div>
                <div className="bg-navy/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-navy/70 mb-1">Pelunasan 50%</p>
                  <p className="text-base font-bold text-navy">{formatCurrency(selectedEscrow.project.final_amount)}</p>
                  <PaymentStatusBadge status={selectedEscrow.finalStatus} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-700 mb-1">Ditahan</p>
                <p className="text-base font-bold text-amber-700">{formatCurrency(selectedEscrow.held_balance)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-700 mb-1">Dicairkan</p>
                <p className="text-base font-bold text-emerald-700">{formatCurrency(selectedEscrow.released_balance)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 mb-1">Dikembalikan</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(selectedEscrow.refunded_balance)}</p>
              </div>
            </div>

            <RecentTransactions projectId={selectedEscrow.project_id} />

            {canAct && selectedEscrow.held_balance > 0 && (
              <div className="flex gap-2 pt-3 border-t border-border">
                {['in_review', 'completed'].includes(selectedEscrow.project.status) && (
                  <button
                    onClick={() => setReleaseModal(true)}
                    className="btn-primary flex-1 justify-center"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Cairkan Escrow
                  </button>
                )}
                {selectedEscrow.project.status === 'disputed' && (
                  <button
                    onClick={() => setRefundModal(true)}
                    className="btn-danger flex-1 justify-center"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Terbitkan Pengembalian
                  </button>
                )}
                {!['in_review', 'completed', 'disputed'].includes(selectedEscrow.project.status) && (
                  <p className="text-xs text-navy/40 italic w-full text-center">
                    Aksi tersedia setelah proyek mencapai tahap tinjauan
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={releaseModal} onClose={() => setReleaseModal(false)} title="Cairkan Escrow">
        {selectedEscrow && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Konfirmasi Pencairan Escrow</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Dana akan ditransfer ke rekening perusahaan dalam 1 jam sesuai SLA. Aksi ini dicatat di jejak audit.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Proyek', selectedEscrow.project_title],
                ['Klien', selectedEscrow.client_name],
                ['Jumlah', formatCurrency(selectedEscrow.held_balance)],
                ['Tujuan', 'Rekening IDR Perusahaan Manava'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{label}</span>
                  <span className="font-medium text-navy">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReleaseModal(false)} className="btn-secondary">
                Batal
              </button>
              <button onClick={handleRelease} className="btn-primary">
                <TrendingUp className="w-4 h-4" />
                Cairkan
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Terbitkan Pengembalian">
        {selectedEscrow && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Ini akan mengembalikan dana ke klien</p>
                <p className="text-xs text-red-700 mt-1">
                  Saldo escrow yang ditahan akan dikembalikan ke metode pembayaran asli klien. Aksi ini dicatat dan tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Proyek', selectedEscrow.project_title],
                ['Klien', selectedEscrow.client_name],
                ['Jumlah Pengembalian', formatCurrency(selectedEscrow.held_balance)],
                ['Metode', 'Metode pembayaran asli'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{label}</span>
                  <span className="font-medium text-navy">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRefundModal(false)} className="btn-secondary">
                Batal
              </button>
              <button onClick={handleRefund} className="btn-danger">
                <ArrowDownLeft className="w-4 h-4" />
                Terbitkan Pengembalian
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

interface PaymentPhaseIndicatorProps {
  amount: number
  status: 'pending' | 'paid' | 'n/a'
  label: string
}

function PaymentPhaseIndicator({ amount, status }: PaymentPhaseIndicatorProps) {
  if (status === 'n/a') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gray-400">-</span>
        </div>
        <span className="text-[10px] text-navy/30">-</span>
      </div>
    )
  }

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[10px] text-emerald-600 font-medium">{formatCurrency(amount)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <span className="text-[10px] text-amber-600 font-medium">{formatCurrency(amount)}</span>
    </div>
  )
}

function PaymentStatusBadge({ status }: { status: 'pending' | 'paid' | 'n/a' }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-1">
        <CheckCircle2 className="w-3 h-3" />
        Lunas
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium mt-1">
        <Clock className="w-3 h-3" />
        Menunggu
      </span>
    )
  }
  return <span className="text-[10px] text-navy/30 mt-1">-</span>
}

function RecentTransactions({ projectId }: { projectId: string }) {
  const txs = mockTransactions.filter(t => t.project_id === projectId).slice(0, 3)

  if (txs.length === 0) {
    return (
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">Transaksi Terakhir</p>
        <p className="text-sm text-navy/30 text-center py-2">Belum ada transaksi</p>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    dp_payment: 'Pembayaran DP',
    final_payment: 'Pembayaran Akhir',
    major_topup: 'Top-up Revisi',
    escrow_release: 'Dicairkan',
    refund: 'Pengembalian',
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">Transaksi Terakhir</p>
      <div className="space-y-2">
        {txs.map(tx => (
          <div key={tx.transaction_id} className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-sm font-medium text-navy">{typeLabels[tx.type] ?? tx.type}</p>
              <p className="text-xs text-navy/40">{formatDate(tx.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-navy">{formatCurrency(tx.amount)}</p>
              <StatusBadge status={tx.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
