// List laporan departemen untuk HR Admin

import { useMemo, useState } from 'react'
import { Calendar, Eye, AlertCircle } from 'lucide-react'
import { useReports } from '../../hooks/queries/useReports'
import type { ReportListResponse } from '../../types'

interface ReportListProps {
  onSelectReport?: (reportId: string) => void
}

export default function ReportListView({ onSelectReport }: ReportListProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const { data: reports = [], isLoading, error } = useReports({
    period: selectedPeriod || undefined,
  })

  // Group reports by period
  const periods = useMemo(() => {
    const set = new Set((reports as any[]).map((r: any) => r.period))
    return Array.from(set) as string[]
  }, [reports])

  const filtered = useMemo(() => {
    if (!selectedPeriod) return reports as ReportListResponse[]
    return (reports as ReportListResponse[]).filter((r: any) => r.period === selectedPeriod)
  }, [reports, selectedPeriod])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-navy/50">Memuat laporan…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-4 h-4 mt-1 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Gagal memuat laporan</p>
          <p className="text-xs text-red-700 mt-0.5">Coba refresh halaman atau hubungi admin</p>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="card text-center py-12">
        <Calendar className="w-8 h-8 mx-auto mb-3 text-navy/20" />
        <p className="text-sm font-medium text-navy">Belum ada laporan</p>
        <p className="text-xs text-navy/50 mt-1">Admin manager akan mengirim laporan departemen setiap periode</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Period filter */}
      {periods.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPeriod(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedPeriod === null
                ? 'bg-navy text-white'
                : 'bg-navy/5 text-navy/70 hover:bg-navy/10'
            }`}
          >
            Semua
          </button>
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedPeriod === p
                  ? 'bg-navy text-white'
                  : 'bg-navy/5 text-navy/70 hover:bg-navy/10'
              }`}
            >
              {formatPeriod(p)}
            </button>
          ))}
        </div>
      )}

      {/* Reports table */}
      <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px]" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
          <thead className="bg-[#021526]/[0.03]">
            <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
              <th className="px-5 py-3">Departemen</th>
              <th className="px-5 py-3">Manajer</th>
              <th className="px-5 py-3">Periode</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Diteruskan</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {filtered.map((report: any) => (
              <tr key={report.id} className="hover:bg-[#021526]/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-navy">{report.department_name}</p>
                </td>
                <td className="px-5 py-3.5 text-navy/70">
                  {report.manager_name}
                </td>
                <td className="px-5 py-3.5 text-navy/70">
                  {formatPeriod(report.period)}
                </td>
                <td className="px-5 py-3.5">
                  {report.status === 'forwarded' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10.5px] font-semibold text-emerald-700">
                      Menunggu Review HR
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10.5px] font-semibold text-amber-700">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[11px] text-navy/50">
                  {formatRelativeDate(new Date(report.forwarded_at ?? report.submitted_at))}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onSelectReport?.(report.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-navy bg-navy/5 hover:bg-navy/10 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-[13px] text-[#596074]">
          Tidak ada laporan untuk periode yang dipilih
        </div>
      )}
    </div>
  )
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthIdx = Number(m) - 1
  return `${monthNames[monthIdx] ?? m} ${y}`
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari lalu`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
  return `${Math.floor(diffDays / 30)} bulan lalu`
}
