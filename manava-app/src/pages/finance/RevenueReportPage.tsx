import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  ArrowRight,
  Info,
  PieChart,
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency } from '../../lib/utils'
import type { UserRole } from '../../types'

interface MonthlyRevenueData {
  month: string
  year: number
  month_label: string
  dp_received: number
  recognized_revenue: number
  deferred_balance: number
  projects_completed: number
  projects_started: number
}

interface RevenueBreakdown {
  project_title: string
  client_name: string
  project_value: number
  dp_received: number
  status: 'completed' | 'in_progress' | 'deferred'
  completed_at?: string
}

function generateRevenueData(): MonthlyRevenueData[] {
  return [
    {
      month: '2026-06',
      year: 2026,
      month_label: 'Juni 2026',
      dp_received: 15800000,
      recognized_revenue: 12000000,
      deferred_balance: 6800000,
      projects_completed: 4,
      projects_started: 6,
    },
    {
      month: '2026-05',
      year: 2026,
      month_label: 'Mei 2026',
      dp_received: 18500000,
      recognized_revenue: 14200000,
      deferred_balance: 3000000,
      projects_completed: 5,
      projects_started: 7,
    },
    {
      month: '2026-04',
      year: 2026,
      month_label: 'April 2026',
      dp_received: 12300000,
      recognized_revenue: 9800000,
      deferred_balance: 0,
      projects_completed: 3,
      projects_started: 4,
    },
    {
      month: '2026-03',
      year: 2026,
      month_label: 'Maret 2026',
      dp_received: 16700000,
      recognized_revenue: 15500000,
      deferred_balance: 0,
      projects_completed: 6,
      projects_started: 5,
    },
    {
      month: '2026-02',
      year: 2026,
      month_label: 'Februari 2026',
      dp_received: 11200000,
      recognized_revenue: 10800000,
      deferred_balance: 0,
      projects_completed: 4,
      projects_started: 4,
    },
    {
      month: '2026-01',
      year: 2026,
      month_label: 'Januari 2026',
      dp_received: 9500000,
      recognized_revenue: 8200000,
      deferred_balance: 0,
      projects_completed: 3,
      projects_started: 4,
    },
  ]
}

function generateBreakdown(month: string): RevenueBreakdown[] {
  const breakdowns: Record<string, RevenueBreakdown[]> = {
    '2026-06': [
      { project_title: 'Wedding Film Color Grade', client_name: 'Bintang Studio', project_value: 8000000, dp_received: 4000000, status: 'completed', completed_at: '2026-06-10' },
      { project_title: 'Fashion Campaign Video', client_name: 'Zara Fashion', project_value: 6000000, dp_received: 3000000, status: 'in_progress' },
      { project_title: 'Product Catalog Retouch', client_name: 'Citra Client', project_value: 2000000, dp_received: 1000000, status: 'in_progress' },
      { project_title: 'Corporate Headshots', client_name: 'Mega Corp', project_value: 4000000, dp_received: 2000000, status: 'deferred' },
      { project_title: 'E-commerce Lifestyle', client_name: 'Lazada Official', project_value: 3000000, dp_received: 1500000, status: 'in_progress' },
      { project_title: 'Luxury Watch Campaign', client_name: 'TimeX Indonesia', project_value: 5000000, dp_received: 2500000, status: 'completed', completed_at: '2026-06-25' },
    ],
    '2026-05': [
      { project_title: 'Real Estate Photography', client_name: 'Property Plus', project_value: 4000000, dp_received: 2000000, status: 'completed', completed_at: '2026-05-15' },
      { project_title: 'Restaurant Menu Design', client_name: 'Warung Nusantara', project_value: 3500000, dp_received: 1750000, status: 'completed', completed_at: '2026-05-20' },
      { project_title: 'Music Video Edit', client_name: 'Indie Records', project_value: 6000000, dp_received: 3000000, status: 'completed', completed_at: '2026-05-28' },
      { project_title: 'Product Video Ads', client_name: 'TechGadget', project_value: 5000000, dp_received: 2500000, status: 'completed', completed_at: '2026-05-30' },
      { project_title: 'Fashion Lookbook', client_name: 'Batik Modern', project_value: 7500000, dp_received: 3750000, status: 'completed', completed_at: '2026-05-31' },
    ],
  }
  return breakdowns[month] ?? []
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: 'Laporan pendapatan bulanan sesuai standar IFRS 15. Pendapatan diakui saat proyek selesai.' },
  hr_admin: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: '' },
  admin_manager: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: '' },
  editor: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: '' },
  client: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: '' },
  mediator: { eyebrow: 'Laporan', title: 'Laporan Pendapatan', description: '' },
  finance: { eyebrow: 'Pelaporan Keuangan', title: 'Laporan Pendapatan IFRS 15', description: 'Pisahkan DP masuk (pendapatan ditangguhkan) dari pendapatan yang diakui. Sesuai standar IFRS 15.' },
}

export default function RevenueReportPage({ role }: { role: UserRole }) {
  const [data] = useState<MonthlyRevenueData[]>(() => generateRevenueData())
  const [selectedMonth, setSelectedMonth] = useState<MonthlyRevenueData | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => {
    const ytdRecognized = data.reduce((sum, d) => sum + d.recognized_revenue, 0)
    const totalDeferred = data.reduce((sum, d) => sum + d.deferred_balance, 0)
    const totalDP = data.reduce((sum, d) => sum + d.dp_received, 0)
    const recognitionRate = totalDP > 0 ? Math.round((ytdRecognized / totalDP) * 100) : 0
    const currentMonth = data[0]

    return {
      ytdRecognized,
      totalDeferred,
      recognitionRate,
      currentMonthRevenue: currentMonth?.recognized_revenue ?? 0,
    }
  }, [data])

  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.dp_received, d.recognized_revenue)))
  }, [data])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleExport() {
    showToast('Laporan sedang disiapkan untuk diunduh...')
  }

  function closeModal() {
    setSelectedMonth(null)
  }

  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.superadmin

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        description={h.description}
        role={role}
        actions={[
          {
            label: 'Export Laporan',
            icon: Download,
            onClick: handleExport,
            variant: 'secondary',
          },
        ]}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendapatan YTD Diakui"
          value={formatCurrency(stats.ytdRecognized)}
          icon={TrendingUp}
          accent="bg-emerald-50"
          change="Januari - Juni 2026"
          changeType="up"
        />
        <StatCard
          label="Total Ditangguhkan"
          value={formatCurrency(stats.totalDeferred)}
          icon={Clock}
          accent="bg-amber-50"
          change="Belum diakui"
        />
        <StatCard
          label="Tingkat Pengakuan"
          value={`${stats.recognitionRate}%`}
          icon={PieChart}
          accent="bg-blue-50"
          change="Diakui vs DP masuk"
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatCurrency(stats.currentMonthRevenue)}
          icon={BarChart3}
          accent="bg-lime-50"
          change="Juni 2026"
        />
      </div>

      <div className="card p-4 bg-blue-50/50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Standar IFRS 15 - Pengakuan Pendapatan</p>
            <p className="text-xs text-navy/60 mt-1">
              Pendapatan diakui <strong>hanya</strong> ketika kendali atas deliverable ditransfer ke klien (proyek selesai).
              DP yang diterima sebelum penyelesaian dicatat sebagai <strong>pendapatan ditangguhkan</strong> (deferred revenue).
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Visualisasi Pendapatan Bulanan</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-navy/60">DP Diterima (Ditangguhkan)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-navy/60">Pendapatan Diakui</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map(month => {
            const dpWidth = (month.dp_received / maxValue) * 100
            const recognizedWidth = (month.recognized_revenue / maxValue) * 100

            return (
              <div key={month.month} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-navy">{month.month_label}</span>
                  <button
                    onClick={() => setSelectedMonth(month)}
                    className="text-xs text-navy/50 hover:text-navy underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Detail
                  </button>
                </div>
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-400/80 transition-all duration-300"
                    style={{ width: `${dpWidth}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300"
                    style={{ width: `${recognizedWidth}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {formatCurrency(month.recognized_revenue)}
                    </span>
                    {month.deferred_balance > 0 && (
                      <span className="text-xs font-medium text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded">
                        +{formatCurrency(month.deferred_balance)} ditangguhkan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy">Rincian Pendapatan Bulanan</h3>
          <button
            onClick={handleExport}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="text-right">DP Diterima</th>
                <th className="text-right">Pendapatan Diakui</th>
                <th className="text-right">Saldo Ditangguhkan</th>
                <th className="text-center">Proyek Selesai</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(month => {
                const isFullyRecognized = month.deferred_balance === 0
                const recognitionPercent = month.dp_received > 0
                  ? Math.round((month.recognized_revenue / month.dp_received) * 100)
                  : 100

                return (
                  <tr key={month.month}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-navy/40" />
                        <span className="text-sm font-medium text-navy">{month.month_label}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-medium text-amber-600">
                        {formatCurrency(month.dp_received)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(month.recognized_revenue)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`text-sm font-medium ${month.deferred_balance > 0 ? 'text-amber-600' : 'text-navy/40'}`}>
                        {month.deferred_balance > 0 ? formatCurrency(month.deferred_balance) : '-'}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-semibold text-navy">{month.projects_completed}</span>
                      <span className="text-xs text-navy/40"> / {month.projects_started}</span>
                    </td>
                    <td>
                      {isFullyRecognized ? (
                        <Badge variant="green">Diakui Penuh</Badge>
                      ) : (
                        <Badge variant="yellow">{recognitionPercent}% Diakui</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedMonth(month)}
                        className="text-xs text-navy/60 hover:text-navy underline"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy/20">
                <td className="font-semibold text-navy">Total YTD</td>
                <td className="text-right font-semibold text-amber-600">
                  {formatCurrency(data.reduce((s, d) => s + d.dp_received, 0))}
                </td>
                <td className="text-right font-bold text-emerald-600">
                  {formatCurrency(stats.ytdRecognized)}
                </td>
                <td className="text-right font-semibold text-amber-600">
                  {formatCurrency(stats.totalDeferred)}
                </td>
                <td className="text-center font-semibold text-navy">
                  {data.reduce((s, d) => s + d.projects_completed, 0)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedMonth}
        onClose={closeModal}
        title={`Detail Pendapatan - ${selectedMonth?.month_label ?? ''}`}
      >
        {selectedMonth && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 mb-1">DP Diterima</p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(selectedMonth.dp_received)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 mb-1">Pendapatan Diakui</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedMonth.recognized_revenue)}</p>
              </div>
            </div>

            <div className="bg-navy/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Alur Pengakuan Pendapatan</p>
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-xs text-navy/60">DP Masuk</p>
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(selectedMonth.dp_received)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-navy/30 shrink-0" />
                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-navy/60">Proyek Berjalan</p>
                  <p className="text-sm font-semibold text-blue-600">{selectedMonth.projects_started - selectedMonth.projects_completed}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-navy/30 shrink-0" />
                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-navy/60">Diakui</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(selectedMonth.recognized_revenue)}</p>
                </div>
              </div>
            </div>

            {selectedMonth.deferred_balance > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pendapatan Ditangguhkan</p>
                  <p className="text-xs text-amber-700 mt-1">
                    <strong>{formatCurrency(selectedMonth.deferred_balance)}</strong> masih ditangguhkan karena proyek belum selesai.
                    Akan diakui saat deliverable diterima klien.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">
                Rincian Proyek
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {generateBreakdown(selectedMonth.month).map((project, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      project.status === 'completed' ? 'bg-emerald-100' :
                      project.status === 'in_progress' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {project.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : project.status === 'in_progress' ? (
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{project.project_title}</p>
                      <p className="text-xs text-navy/50">{project.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        project.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {formatCurrency(project.status === 'completed' ? project.project_value : project.dp_received)}
                      </p>
                      <Badge variant={
                        project.status === 'completed' ? 'green' :
                        project.status === 'in_progress' ? 'blue' : 'yellow'
                      }>
                        {project.status === 'completed' ? 'Diakui' :
                         project.status === 'in_progress' ? 'Berjalan' : 'Ditangguhkan'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={closeModal} className="btn-secondary">
                Tutup
              </button>
              <button onClick={handleExport} className="btn-primary">
                <Download className="w-4 h-4" />
                Export Bulan Ini
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
