// Dashboard KPI Cards untuk departemen — menampilkan 3 metrik utama:
// KPI Rata-rata, Rating Client, dan Penyelesaian (%)
// Data diambil dari KpiSnapshot (monthly aggregates), menampilkan nilai bulan terbaru.

import { useMemo } from 'react'
import type { MonthlyKpiPoint } from '../../types'

interface DepartmentKpiMetricsProps {
  points: MonthlyKpiPoint[]
  department: string
}

interface KpiMetric {
  title: string
  value: number
  suffix?: string
  description: string
}

function getLatestMetrics(points: MonthlyKpiPoint[]): {
  kpiAverage: number
  clientRating: number
  completionRate: number
} | null {
  if (points.length === 0) return null

  // Sort by period (ISO date format) to get the latest month
  const sorted = [...points].sort((a, b) => b.period.localeCompare(a.period))
  const latest = sorted[0]

  if (!latest) return null

  return {
    kpiAverage: latest.kpi_average ?? 0,
    clientRating: latest.avg_client_rating ?? 0,
    completionRate: latest.completion_rate ?? 0,
  }
}

function MetricCard({ title, value, suffix, description }: KpiMetric & { description: string }) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold text-navy">{value.toFixed(2)}</p>
        {suffix && <p className="text-lg font-semibold text-navy/70">{suffix}</p>}
      </div>
      <p className="text-xs text-navy/60 leading-relaxed">{description}</p>
    </div>
  )
}

export function DepartmentKpiMetrics({ points, department }: DepartmentKpiMetricsProps) {
  const metrics = useMemo(() => getLatestMetrics(points), [points])

  if (!metrics) {
    return (
      <div className="rounded-xl border border-border bg-white/50 p-4 text-center">
        <p className="text-sm text-navy/50">Belum ada data KPI untuk departemen {department}</p>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
        Ringkasan KPI — {department}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="KPI Rata-rata"
          value={metrics.kpiAverage}
          description="Skor KPI komposit departemen (rating klien + penyelesaian + rating manajer)"
        />
        <MetricCard
          title="Rating Client"
          value={metrics.clientRating}
          description="Rata-rata rating dari klien untuk semua proyek bulan ini"
        />
        <MetricCard
          title="Penyelesaian"
          value={metrics.completionRate}
          suffix="%"
          description="Persentase proyek diselesaikan tepat waktu bulan lalu"
        />
      </div>
    </section>
  )
}
