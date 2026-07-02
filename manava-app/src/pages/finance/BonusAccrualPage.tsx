import { useState, useMemo } from 'react'
import {
  Award,
  CheckCircle2,
  Clock,
  Users,
  Wallet,
  Calculator,
  Star,
  Calendar,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockProjects, mockEditors } from '../../data/mockData'
import type { UserRole } from '../../types'

type PayoutStatus = 'accrued' | 'approved' | 'paid'

interface BonusAccrual {
  accrual_id: string
  project_id: string
  project_title: string
  client_name: string
  editor_id: string
  editor_name: string
  editor_avatar?: string
  project_value: number
  bonus_amount: number
  bonus_rate: number
  accrued_at: string
  approved_at?: string
  paid_at?: string
  payout_status: PayoutStatus
  payroll_period?: string
}

const BONUS_RATE = 0.10

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { label: string; variant: 'blue' | 'yellow' | 'green' }> = {
  accrued: { label: 'Terakumulasi', variant: 'blue' },
  approved: { label: 'Disetujui', variant: 'yellow' },
  paid: { label: 'Dibayar', variant: 'green' },
}

function generateBonusAccruals(): BonusAccrual[] {
  const completedProjects = mockProjects.filter(p => p.status === 'completed')

  const accruals: BonusAccrual[] = [
    ...completedProjects.map((project, idx) => {
      const editor = mockEditors.find(e => e.editor_id === project.editor_id)
      const bonusAmount = project.project_value * BONUS_RATE

      const statuses: PayoutStatus[] = ['paid', 'approved', 'accrued']
      const status = statuses[idx % statuses.length]

      const accrualDate = project.completed_at ?? project.created_at

      return {
        accrual_id: `bonus-${project.project_id}`,
        project_id: project.project_id,
        project_title: project.title,
        client_name: project.client_name,
        editor_id: project.editor_id,
        editor_name: project.editor_name,
        editor_avatar: editor?.avatar,
        project_value: project.project_value,
        bonus_amount: bonusAmount,
        bonus_rate: BONUS_RATE,
        accrued_at: accrualDate,
        approved_at: status !== 'accrued' ? accrualDate : undefined,
        paid_at: status === 'paid' ? '2026-06-30T00:00:00' : undefined,
        payout_status: status,
        payroll_period: status === 'paid' ? 'Juni 2026' : undefined,
      }
    }),
    {
      accrual_id: 'bonus-p201',
      project_id: 'p201',
      project_title: 'Luxury Watch Campaign',
      client_name: 'TimeX Indonesia',
      editor_id: 'e1',
      editor_name: 'Budi Santoso',
      editor_avatar: mockEditors.find(e => e.editor_id === 'e1')?.avatar,
      project_value: 5000000,
      bonus_amount: 500000,
      bonus_rate: BONUS_RATE,
      accrued_at: '2026-06-25T14:00:00',
      payout_status: 'accrued',
    },
    {
      accrual_id: 'bonus-p202',
      project_id: 'p202',
      project_title: 'Restaurant Menu Photography',
      client_name: 'Warung Nusantara',
      editor_id: 'e2',
      editor_name: 'Sari Dewi',
      editor_avatar: mockEditors.find(e => e.editor_id === 'e2')?.avatar,
      project_value: 3500000,
      bonus_amount: 350000,
      bonus_rate: BONUS_RATE,
      accrued_at: '2026-06-22T10:00:00',
      approved_at: '2026-06-23T09:00:00',
      payout_status: 'approved',
    },
    {
      accrual_id: 'bonus-p203',
      project_id: 'p203',
      project_title: 'Fashion Lookbook Spring',
      client_name: 'Batik Modern',
      editor_id: 'e4',
      editor_name: 'Maya Putri',
      editor_avatar: mockEditors.find(e => e.editor_id === 'e4')?.avatar,
      project_value: 7500000,
      bonus_amount: 750000,
      bonus_rate: BONUS_RATE,
      accrued_at: '2026-06-20T16:00:00',
      approved_at: '2026-06-21T10:00:00',
      paid_at: '2026-06-30T00:00:00',
      payout_status: 'paid',
      payroll_period: 'Juni 2026',
    },
  ]

  return accruals.sort((a, b) => new Date(b.accrued_at).getTime() - new Date(a.accrued_at).getTime())
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Finansial', title: 'Akrual Bonus Proyek', description: 'Kelola bonus 10% otomatis untuk editor dari proyek yang selesai.' },
  hr_admin: { eyebrow: 'Kompensasi', title: 'Bonus Editor', description: 'Pantau dan setujui bonus proyek untuk dimasukkan ke payroll.' },
  admin_manager: { eyebrow: 'Tim', title: 'Bonus Proyek', description: 'Lihat bonus yang diperoleh tim Anda.' },
  editor: { eyebrow: 'Kompensasi', title: 'Bonus Saya', description: 'Lihat bonus proyek yang Anda peroleh.' },
  client: { eyebrow: 'Finansial', title: 'Bonus', description: '' },
  mediator: { eyebrow: 'Finansial', title: 'Bonus', description: '' },
  finance: { eyebrow: 'Operasi Keuangan', title: 'Akrual Bonus', description: 'Proses pembayaran bonus editor. Bonus 10% otomatis terakumulasi saat proyek selesai.' },
}

export default function BonusAccrualPage({ role }: { role: UserRole }) {
  const [accruals, setAccruals] = useState<BonusAccrual[]>(() => generateBonusAccruals())
  const [selectedAccrual, setSelectedAccrual] = useState<BonusAccrual | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const totalAccrued = accruals.reduce((sum, a) => sum + a.bonus_amount, 0)
    const totalPaid = accruals
      .filter(a => a.payout_status === 'paid')
      .reduce((sum, a) => sum + a.bonus_amount, 0)
    const totalPending = accruals
      .filter(a => a.payout_status !== 'paid')
      .reduce((sum, a) => sum + a.bonus_amount, 0)
    const eligibleEditors = new Set(accruals.map(a => a.editor_id)).size

    return { totalAccrued, totalPaid, totalPending, eligibleEditors }
  }, [accruals])

  const canAct = role === 'finance' || role === 'hr_admin' || role === 'superadmin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleApprove(accrualId: string) {
    setAccruals(prev =>
      prev.map(a =>
        a.accrual_id === accrualId
          ? { ...a, payout_status: 'approved' as PayoutStatus, approved_at: new Date().toISOString() }
          : a
      )
    )
    showToast('Bonus disetujui dan akan dimasukkan ke payroll berikutnya.')
  }

  function handleMarkPaid(accrualId: string) {
    setAccruals(prev =>
      prev.map(a =>
        a.accrual_id === accrualId
          ? { ...a, payout_status: 'paid' as PayoutStatus, paid_at: new Date().toISOString(), payroll_period: 'Juli 2026' }
          : a
      )
    )
    showToast('Bonus telah ditandai sebagai dibayar.')
  }

  function closeModal() {
    setSelectedAccrual(null)
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
          label="Total Bonus Terakumulasi"
          value={formatCurrency(stats.totalAccrued)}
          icon={Award}
          accent="bg-lime-50"
          change="10% dari nilai proyek"
        />
        <StatCard
          label="Total Sudah Dibayar"
          value={formatCurrency(stats.totalPaid)}
          icon={Wallet}
          accent="bg-emerald-50"
          change="Via payroll"
          changeType="up"
        />
        <StatCard
          label="Menunggu Pembayaran"
          value={formatCurrency(stats.totalPending)}
          icon={Clock}
          accent="bg-amber-50"
          change="Belum dibayar"
        />
        <StatCard
          label="Editor Eligible"
          value={stats.eligibleEditors}
          icon={Users}
          accent="bg-blue-50"
          change="Penerima bonus"
        />
      </div>

      <div className="card p-4 bg-lime-50/50 border-lime-200">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-lime-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Kebijakan Bonus Proyek</p>
            <p className="text-xs text-navy/60 mt-1">
              Editor secara otomatis menerima bonus <strong>10%</strong> dari nilai proyek ketika status proyek menjadi "Selesai".
              Bonus terakumulasi dan dibayarkan melalui payroll bulanan setelah disetujui oleh HR.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Daftar Bonus Proyek</h3>
          <p className="text-xs text-navy/50">{accruals.length} bonus</p>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Proyek</th>
                <th>Editor</th>
                <th className="text-right">Nilai Proyek</th>
                <th className="text-right">Bonus (10%)</th>
                <th>Tanggal Akrual</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accruals.map(accrual => {
                const statusConfig = PAYOUT_STATUS_CONFIG[accrual.payout_status]

                return (
                  <tr key={accrual.accrual_id}>
                    <td>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate max-w-[180px]">
                          {accrual.project_title}
                        </p>
                        <p className="text-xs text-navy/50">{accrual.client_name}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {accrual.editor_avatar ? (
                          <img
                            src={accrual.editor_avatar}
                            alt={accrual.editor_name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-navy">
                              {accrual.editor_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-navy">{accrual.editor_name}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium text-navy whitespace-nowrap">
                      {formatCurrency(accrual.project_value)}
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-bold text-lime-700">
                        {formatCurrency(accrual.bonus_amount)}
                      </span>
                    </td>
                    <td className="text-sm text-navy/60 whitespace-nowrap">
                      {formatDate(accrual.accrued_at)}
                    </td>
                    <td>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedAccrual(accrual)}
                          className="text-xs text-navy/60 hover:text-navy underline"
                        >
                          Detail
                        </button>
                        {canAct && accrual.payout_status === 'accrued' && (
                          <button
                            onClick={() => handleApprove(accrual.accrual_id)}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Setujui
                          </button>
                        )}
                        {canAct && accrual.payout_status === 'approved' && (
                          <button
                            onClick={() => handleMarkPaid(accrual.accrual_id)}
                            className="btn-secondary text-xs px-3 py-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            Tandai Dibayar
                          </button>
                        )}
                        {accrual.payout_status === 'paid' && accrual.payroll_period && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {accrual.payroll_period}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedAccrual}
        onClose={closeModal}
        title="Detail Bonus Proyek"
      >
        {selectedAccrual && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {selectedAccrual.editor_avatar ? (
                <img
                  src={selectedAccrual.editor_avatar}
                  alt={selectedAccrual.editor_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-navy">
                    {selectedAccrual.editor_name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-navy">{selectedAccrual.editor_name}</p>
                <p className="text-xs text-navy/50">Penerima Bonus</p>
              </div>
              <div className="ml-auto">
                <Badge variant={PAYOUT_STATUS_CONFIG[selectedAccrual.payout_status].variant}>
                  {PAYOUT_STATUS_CONFIG[selectedAccrual.payout_status].label}
                </Badge>
              </div>
            </div>

            <div className="bg-navy/5 rounded-xl p-4">
              <p className="text-sm font-semibold text-navy mb-1">{selectedAccrual.project_title}</p>
              <p className="text-xs text-navy/50">{selectedAccrual.client_name}</p>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-navy/5 px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Perhitungan Bonus
                </p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-navy/60">Nilai Proyek</span>
                  <span className="text-sm font-semibold text-navy">{formatCurrency(selectedAccrual.project_value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-navy/60">Rate Bonus</span>
                  <span className="text-sm font-medium text-navy">{(selectedAccrual.bonus_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="border-t border-dashed border-border pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-navy">Total Bonus</span>
                  <span className="text-lg font-bold text-lime-700">{formatCurrency(selectedAccrual.bonus_amount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Timeline</p>
              <div className="space-y-2">
                <TimelineItem
                  icon={Star}
                  label="Proyek Selesai"
                  date={selectedAccrual.accrued_at}
                  active
                />
                <TimelineItem
                  icon={CheckCircle2}
                  label="Bonus Disetujui"
                  date={selectedAccrual.approved_at}
                  active={!!selectedAccrual.approved_at}
                />
                <TimelineItem
                  icon={Wallet}
                  label="Bonus Dibayar"
                  date={selectedAccrual.paid_at}
                  note={selectedAccrual.payroll_period ? `Periode: ${selectedAccrual.payroll_period}` : undefined}
                  active={!!selectedAccrual.paid_at}
                />
              </div>
            </div>

            {canAct && selectedAccrual.payout_status === 'accrued' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={closeModal} className="btn-secondary">
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleApprove(selectedAccrual.accrual_id)
                    closeModal()
                  }}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Setujui Bonus
                </button>
              </div>
            )}

            {canAct && selectedAccrual.payout_status === 'approved' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={closeModal} className="btn-secondary">
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleMarkPaid(selectedAccrual.accrual_id)
                    closeModal()
                  }}
                  className="btn-primary"
                >
                  <Wallet className="w-4 h-4" />
                  Tandai Dibayar
                </button>
              </div>
            )}

            {selectedAccrual.payout_status === 'paid' && (
              <div className="flex justify-end pt-2 border-t border-border">
                <button onClick={closeModal} className="btn-secondary">
                  Tutup
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

interface TimelineItemProps {
  icon: typeof Star
  label: string
  date?: string
  note?: string
  active: boolean
}

function TimelineItem({ icon: Icon, label, date, note, active }: TimelineItemProps) {
  return (
    <div className={`flex items-start gap-3 ${active ? '' : 'opacity-40'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        active ? 'bg-emerald-100' : 'bg-gray-100'
      }`}>
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${active ? 'text-navy' : 'text-navy/50'}`}>{label}</p>
        {date && (
          <p className="text-xs text-navy/50 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(date)}
          </p>
        )}
        {note && <p className="text-xs text-emerald-600 mt-0.5">{note}</p>}
      </div>
      {active && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
    </div>
  )
}
