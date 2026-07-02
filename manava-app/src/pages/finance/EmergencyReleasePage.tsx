import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  AlertOctagon,
  FileWarning,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { mockEscrowAccounts, mockProjects } from '../../data/mockData'
import type { UserRole } from '../../types'

type SeverityLevel = 'critical' | 'warning' | 'moderate'

interface StuckEscrow {
  escrow_id: string
  project_id: string
  project_title: string
  client_name: string
  editor_name: string
  held_balance: number
  stuck_since: string
  hours_stuck: number
  delay_reason: string
  severity: SeverityLevel
}

const DELAY_REASONS = [
  'Menunggu konfirmasi klien untuk hasil akhir',
  'Sistem pembayaran gateway mengalami gangguan',
  'Verifikasi dokumen tertunda oleh tim compliance',
  'Klien belum merespons permintaan persetujuan',
  'Proses rekonsiliasi manual diperlukan',
  'Dispute belum selesai dimediasi',
  'Editor belum mengunggah deliverable final',
  'Menunggu tanda tangan digital dari klien',
]

function generateStuckEscrows(): StuckEscrow[] {
  const now = new Date()

  return mockEscrowAccounts
    .filter(e => e.held_balance > 0)
    .map((escrow, idx) => {
      const project = mockProjects.find(p => p.project_id === escrow.project_id)
      const hoursVariants = [52, 68, 96, 120, 49]
      const hoursStuck = hoursVariants[idx % hoursVariants.length]
      const stuckSince = new Date(now.getTime() - hoursStuck * 60 * 60 * 1000).toISOString()

      let severity: SeverityLevel = 'moderate'
      if (hoursStuck > 72) severity = 'critical'
      else if (hoursStuck >= 48) severity = 'warning'

      return {
        escrow_id: escrow.escrow_id,
        project_id: escrow.project_id,
        project_title: escrow.project_title,
        client_name: escrow.client_name,
        editor_name: project?.editor_name ?? 'Unknown',
        held_balance: escrow.held_balance,
        stuck_since: stuckSince,
        hours_stuck: hoursStuck,
        delay_reason: DELAY_REASONS[idx % DELAY_REASONS.length],
        severity,
      }
    })
    .filter(e => e.hours_stuck >= 48)
    .sort((a, b) => b.hours_stuck - a.hours_stuck)
}

function getSeverityConfig(severity: SeverityLevel) {
  const configs = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: AlertOctagon,
      iconColor: 'text-red-500',
      badge: 'bg-red-100 text-red-800 border-red-300',
      label: 'Kritis',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      label: 'Peringatan',
    },
    moderate: {
      bg: 'bg-navy/5',
      border: 'border-navy/20',
      text: 'text-navy',
      icon: Clock,
      iconColor: 'text-navy/60',
      badge: 'bg-navy/10 text-navy border-navy/20',
      label: 'Sedang',
    },
  }
  return configs[severity]
}

function formatHoursStuck(hours: number): string {
  if (hours < 24) return `${hours} jam`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days} hari`
  return `${days} hari ${remainingHours} jam`
}

export default function EmergencyReleasePage({ role }: { role: UserRole }) {
  const [stuckEscrows, setStuckEscrows] = useState<StuckEscrow[]>(() => generateStuckEscrows())
  const [selectedEscrow, setSelectedEscrow] = useState<StuckEscrow | null>(null)
  const [releaseReason, setReleaseReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const critical = stuckEscrows.filter(e => e.severity === 'critical')
    const warning = stuckEscrows.filter(e => e.severity === 'warning')
    const totalStuck = stuckEscrows.reduce((sum, e) => sum + e.held_balance, 0)
    const avgHours = stuckEscrows.length > 0
      ? Math.round(stuckEscrows.reduce((sum, e) => sum + e.hours_stuck, 0) / stuckEscrows.length)
      : 0

    return { critical: critical.length, warning: warning.length, totalStuck, avgHours }
  }, [stuckEscrows])

  const canRelease = releaseReason.trim().length >= 10 && confirmText === 'RELEASE'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleRelease() {
    if (!selectedEscrow || !canRelease) return

    setStuckEscrows(prev => prev.filter(e => e.escrow_id !== selectedEscrow.escrow_id))
    setSelectedEscrow(null)
    setReleaseReason('')
    setConfirmText('')
    showToast(`Escrow ${selectedEscrow.project_title} berhasil dicairkan secara manual. Audit log tercatat.`)
  }

  function closeModal() {
    setSelectedEscrow(null)
    setReleaseReason('')
    setConfirmText('')
  }

  if (role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-navy mb-2">Akses Ditolak</h2>
        <p className="text-navy/60 max-w-md">
          Halaman ini hanya dapat diakses oleh Superadmin. Fitur emergency release memerlukan otorisasi tingkat tertinggi.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Darurat"
        title="Emergency Escrow Release"
        description="Pencairan manual untuk escrow yang terhambat lebih dari 48 jam. Setiap aksi dicatat di audit log."
        role={role}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Kasus Kritis"
          value={stats.critical}
          icon={AlertOctagon}
          accent="bg-red-50"
          change=">72 jam tertahan"
          changeType={stats.critical > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="Kasus Peringatan"
          value={stats.warning}
          icon={AlertTriangle}
          accent="bg-amber-50"
          change="48-72 jam tertahan"
        />
        <StatCard
          label="Total Tertahan"
          value={formatCurrency(stats.totalStuck)}
          icon={FileWarning}
          accent="bg-navy/5"
          change="Perlu ditindaklanjuti"
        />
        <StatCard
          label="Rata-rata Waktu"
          value={`${stats.avgHours} jam`}
          icon={Clock}
          accent="bg-blue-50"
          change="Durasi tertahan"
        />
      </div>

      {stuckEscrows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">Tidak Ada Escrow Tertahan</h3>
          <p className="text-sm text-navy/60 max-w-md">
            Semua escrow dalam status normal. Tidak ada kasus yang memerlukan intervensi manual saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">Escrow Memerlukan Intervensi</h3>
            <p className="text-xs text-navy/50">{stuckEscrows.length} kasus</p>
          </div>

          <div className="space-y-3">
            {stuckEscrows.map(escrow => {
              const config = getSeverityConfig(escrow.severity)
              const Icon = config.icon

              return (
                <div
                  key={escrow.escrow_id}
                  className={`card ${config.bg} ${config.border} border-l-4 p-5`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-xl bg-white/80 shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-navy truncate">{escrow.project_title}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-navy/60 mb-2">
                          {escrow.client_name} · Editor: {escrow.editor_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/50">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Tertahan {formatHoursStuck(escrow.hours_stuck)}
                          </span>
                          <span>Sejak {formatDateTime(escrow.stuck_since)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-navy/50 mb-0.5">Saldo Tertahan</p>
                        <p className={`text-lg font-bold ${config.text}`}>
                          {formatCurrency(escrow.held_balance)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedEscrow(escrow)}
                        className="btn-primary whitespace-nowrap"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Cairkan Manual
                      </button>
                    </div>
                  </div>

                  <div className={`mt-3 pt-3 border-t ${config.border}`}>
                    <p className="text-xs text-navy/50 mb-1">Alasan Tertahan:</p>
                    <p className="text-sm text-navy/70">{escrow.delay_reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal
        open={!!selectedEscrow}
        onClose={closeModal}
        title="Emergency Escrow Release"
      >
        {selectedEscrow && (
          <div className="space-y-5">
            <div className={`${getSeverityConfig(selectedEscrow.severity).bg} border ${getSeverityConfig(selectedEscrow.severity).border} rounded-xl p-4 flex gap-3`}>
              <ShieldAlert className={`w-5 h-5 ${getSeverityConfig(selectedEscrow.severity).iconColor} shrink-0 mt-0.5`} />
              <div>
                <p className="text-sm font-semibold text-navy">Tindakan Darurat - Audit Log Aktif</p>
                <p className="text-xs text-navy/70 mt-1">
                  Pencairan manual ini akan tercatat di sistem audit dengan identitas Anda, timestamp, dan alasan yang diberikan.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Proyek', selectedEscrow.project_title],
                ['Klien', selectedEscrow.client_name],
                ['Editor', selectedEscrow.editor_name],
                ['Jumlah', formatCurrency(selectedEscrow.held_balance)],
                ['Tertahan Sejak', formatDateTime(selectedEscrow.stuck_since)],
                ['Durasi', formatHoursStuck(selectedEscrow.hours_stuck)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/60">{label}</span>
                  <span className="font-medium text-navy text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                <strong>Alasan tertahan:</strong> {selectedEscrow.delay_reason}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Alasan Pencairan Manual <span className="text-red-500">*</span>
              </label>
              <textarea
                value={releaseReason}
                onChange={e => setReleaseReason(e.target.value)}
                placeholder="Jelaskan mengapa escrow ini perlu dicairkan secara manual (min. 10 karakter)..."
                className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/30"
                rows={3}
              />
              <p className="text-xs text-navy/40 mt-1">
                {releaseReason.length}/10 karakter minimum
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Ketik <span className="font-mono bg-navy/10 px-1.5 py-0.5 rounded text-red-600">RELEASE</span> untuk konfirmasi
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Ketik RELEASE"
                className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/30"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeModal} className="btn-secondary">
                Batal
              </button>
              <button
                onClick={handleRelease}
                disabled={!canRelease}
                className={`btn-primary ${!canRelease ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <TrendingUp className="w-4 h-4" />
                Cairkan Sekarang
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
