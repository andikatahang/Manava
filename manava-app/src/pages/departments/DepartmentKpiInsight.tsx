// Insight AI khusus untuk departemen tertentu — menampilkan quick assessment
// otomatis dari data KPI + rekomendasi detail via AI on-demand.

import { useMemo } from 'react'
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, Award, BarChart3 } from 'lucide-react'
import { useKpiRecommendation, type KpiRecommendation } from '../../hooks/queries/useKpi'
import type { MonthlyKpiPoint } from '../../types'

const PRIORITY_META: Record<KpiRecommendation['priority'], { label: string; badge: string; icon: typeof AlertTriangle }> = {
  high: { label: 'Prioritas Tinggi', badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  medium: { label: 'Prioritas Sedang', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: TrendingUp },
  low: { label: 'Prioritas Rendah', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Sparkles },
}

interface DepartmentKpiInsightProps {
  department: string
  points: MonthlyKpiPoint[]
}

interface QuickAssessment {
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  latestKpi: number
  latestRating: number
  latestCompletion: number
  status: 'excellent' | 'good' | 'needs_attention'
  message: string
}

function analyzeKpiTrend(points: MonthlyKpiPoint[], _department?: string): QuickAssessment {
  if (points.length === 0) {
    return {
      trend: 'stable',
      trendValue: 0,
      latestKpi: 0,
      latestRating: 0,
      latestCompletion: 0,
      status: 'needs_attention',
      message: 'Belum ada data KPI untuk departemen ini.',
    }
  }

  // Sort by period to get chronological order
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period))
  const latest = sorted[sorted.length - 1]!
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null

  const latestKpi = latest.kpi_average ?? 0
  const previousKpi = previous?.kpi_average ?? latestKpi
  const diff = latestKpi - previousKpi

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (diff > 0.15) trend = 'up'
  else if (diff < -0.15) trend = 'down'

  let status: 'excellent' | 'good' | 'needs_attention' = 'good'
  if (latestKpi >= 4.5) status = 'excellent'
  else if (latestKpi < 3.5) status = 'needs_attention'

  let message = ''
  if (status === 'excellent') {
    message = trend === 'up'
      ? 'Performa sangat baik dan terus meningkat! Tim konsisten mencapai target KPI.'
      : 'Performa sangat baik dan stabil di level excellence. Pertahankan kualitas kerja tim.'
  } else if (status === 'good') {
    message = trend === 'up'
      ? 'Performa baik dengan tren positif. Terus tingkatkan untuk mencapai excellence.'
      : trend === 'down'
      ? 'Performa masih baik, namun ada penurunan kecil. Monitor ketat untuk mencegah penurunan lebih lanjut.'
      : 'Performa baik dan stabil. Fokus pada peningkatan bertahap untuk mencapai target lebih tinggi.'
  } else {
    message = trend === 'down'
      ? 'Perhatian! KPI menurun dan di bawah target. Evaluasi segera untuk identifikasi masalah dan action plan.'
      : 'KPI di bawah target. Perlu intervensi untuk meningkatkan performa tim.'
  }

  return {
    trend,
    trendValue: diff,
    latestKpi,
    latestRating: latest.avg_client_rating ?? 0,
    latestCompletion: latest.completion_rate ?? 0,
    status,
    message,
  }
}

export function DepartmentKpiInsight({ points, department }: DepartmentKpiInsightProps) {
  const { mutate, data, isPending, isError, error, reset } = useKpiRecommendation()
  const assessment = useMemo(() => analyzeKpiTrend(points), [points])

  if (points.length === 0) {
    return (
      <div className="card p-4 text-center">
        <p className="text-sm text-navy/50">Belum ada data KPI untuk insight AI</p>
      </div>
    )
  }

  const TrendIcon = assessment.trend === 'up' ? TrendingUp : assessment.trend === 'down' ? TrendingDown : Minus
  const trendColor = assessment.trend === 'up' ? 'text-emerald-600' : assessment.trend === 'down' ? 'text-red-600' : 'text-navy/50'
  const statusColor = assessment.status === 'excellent'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : assessment.status === 'good'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  const statusLabel = assessment.status === 'excellent' ? 'Sangat Baik' : assessment.status === 'good' ? 'Baik' : 'Perlu Perhatian'

  return (
    <div className="space-y-4">
      {/* Quick Assessment Card */}
      <div className="card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Quick Assessment
            </p>
            <p className="text-sm text-navy/60 mt-1">
              Analisis otomatis tren KPI departemen
            </p>
          </div>
          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${assessment.trend === 'up' ? 'bg-emerald-50' : assessment.trend === 'down' ? 'bg-red-50' : 'bg-navy-50'}`}>
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-navy/50">Tren 6 Bulan</p>
            <p className={`text-lg font-bold ${trendColor}`}>
              {assessment.trend === 'up' ? '+' : assessment.trend === 'down' ? '' : '~'}
              {Math.abs(assessment.trendValue).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="rounded-xl bg-navy/5 border border-navy/10 p-3">
          <p className="text-sm text-navy leading-relaxed">{assessment.message}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-3.5 h-3.5 text-navy/40" />
              <p className="text-[10px] uppercase tracking-wider text-navy/40">KPI</p>
            </div>
            <p className="text-xl font-bold text-navy">{assessment.latestKpi.toFixed(2)}</p>
            <p className="text-xs text-navy/50 mt-0.5">Latest score</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-navy/40" />
              <p className="text-[10px] uppercase tracking-wider text-navy/40">Done</p>
            </div>
            <p className="text-xl font-bold text-navy">{assessment.latestCompletion.toFixed(0)}%</p>
            <p className="text-xs text-navy/50 mt-0.5">Completion</p>
          </div>
        </div>
      </div>

      {/* AI Recommendations Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Rekomendasi AI
            </p>
            <p className="text-sm text-navy/60 mt-1">
              Analisis mendalam dan action plan
            </p>
          </div>
          <button
            onClick={() => {
              reset()
              mutate()
            }}
            disabled={isPending}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menghitung…
              </>
            ) : data ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Perbarui
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Analisis Detail
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">
            Gagal memuat insight — {(error as Error)?.message ?? 'terjadi kesalahan.'}
          </div>
        )}

        {/* Empty State */}
        {!data && !isPending && !isError && (
          <div className="rounded-xl border border-dashed border-navy/20 p-4 text-center">
            <Sparkles className="w-8 h-8 text-navy/30 mx-auto mb-2" />
            <p className="text-sm text-navy/60 mb-1 font-medium">
              Butuh rekomendasi lebih detail?
            </p>
            <p className="text-xs text-navy/40">
              Klik "Analisis Detail" untuk action plan berbasis AI
            </p>
          </div>
        )}

        {/* AI Recommendations */}
        {data && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-xl bg-navy text-white p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60 mb-1.5">
                <span>Ringkasan</span>
                <span>{data.source === 'openai' ? 'OpenAI' : 'Heuristik'}</span>
              </div>
              <p className="text-sm leading-relaxed">{data.summary}</p>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              {data.recommendations.length > 0 ? (
                data.recommendations.map((r, i) => {
                  const meta = PRIORITY_META[r.priority] ?? PRIORITY_META.low
                  const Icon = meta.icon
                  return (
                    <div key={i} className="rounded-xl border border-border p-3.5 flex gap-3">
                      <span className={`shrink-0 w-8 h-8 rounded-full border ${meta.badge} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-sm text-navy flex items-start gap-1">
                          <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-navy/40" />
                          <span>{r.action}</span>
                        </p>
                        <p className="text-xs text-navy/55 mt-1 pl-5">{r.rationale}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-navy/40 italic">Tren KPI departemen stabil — tidak ada rekomendasi eksplisit.</p>
              )}
            </div>

            {/* Metadata */}
            <p className="text-[11px] text-navy/40">
              Diperbarui {new Date(data.generated_at).toLocaleString('id-ID')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
