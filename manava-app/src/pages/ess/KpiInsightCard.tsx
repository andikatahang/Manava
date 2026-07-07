// Kartu AI Insight untuk ESS Editor - UNIFIED CARD
// Semua sections dalam satu card dengan visual separation internal

import { TrendingUp, TrendingDown, Zap, Star, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react'
import { useMyKpiInsight } from '../../hooks/queries/useMyKpiInsight'

export function KpiInsightCard() {
  const query = useMyKpiInsight()
  const data = query.data?.insight
  const isLoading = query.isLoading

  if (isLoading) {
    return (
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <div className="flex items-center justify-center gap-3">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-navy"></div>
          <p className="text-sm text-navy/60">Menganalisis performa Anda...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const performanceColors = {
    excellent: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Excellent' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Good' },
    needs_improvement: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Needs Improvement' },
  }

  const trendIcons = {
    improving: { icon: TrendingUp, color: 'text-emerald-600', label: 'Meningkat' },
    stable: { icon: Zap, color: 'text-blue-600', label: 'Stabil' },
    declining: { icon: TrendingDown, color: 'text-orange-600', label: 'Menurun' },
  }

  const colors = performanceColors[data.performance_level]
  const trendData = trendIcons[data.trend]
  const TrendIcon = trendData.icon

  return (
    <div className="card p-6 bg-white border border-border">
      {/* ── Header Section ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Star className={`w-6 h-6 ${colors.text}`} />
          <div>
            <h3 className="text-sm font-semibold text-navy">AI Performance Insight</h3>
            <p className="text-xs text-navy/50 mt-0.5">Analisis personal untuk performa dan motivasi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.text} bg-white border ${colors.border}`}>
            {colors.label}
          </span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${colors.bg} ${colors.border} border`}>
            <TrendIcon className={`w-4 h-4 ${trendData.color}`} />
            <span className="text-xs font-medium text-navy">{trendData.label}</span>
          </div>
        </div>
      </div>

      {/* ── Summary Section ────────────────────────────────────────────────────── */}
      <p className="text-sm text-navy leading-relaxed mb-5 pb-5 border-b border-border">
        {data.summary}
      </p>

      {/* ── Motivational Message ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 mb-5 pb-5 border-b border-border">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed font-medium text-white">{data.motivational_message}</p>
        </div>
      </div>

      {/* ── Strengths & Improvements (Internal 2-Column Grid) ───────────────────── */}
      <div className="grid md:grid-cols-2 gap-4 mb-5 pb-5 border-b border-border">
        {/* Key Strengths */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-semibold text-emerald-900">Kekuatan Anda</h4>
          </div>
          <ul className="space-y-2">
            {data.key_strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
                <span className="text-emerald-900">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-900">Area untuk Ditingkatkan</h4>
          </div>
          <ul className="space-y-2">
            {data.areas_for_improvement.length > 0 ? (
              data.areas_for_improvement.map((area, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0"></span>
                  <span className="text-amber-900">{area}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-amber-700 italic">Tidak ada area yang perlu ditingkatkan - terus pertahankan!</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Actionable Tips ────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-900">Tips Actionable untuk Anda</h4>
        </div>
        <ol className="space-y-2.5">
          {data.actionable_tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0 flex-none">
                {idx + 1}
              </span>
              <span className="text-blue-900 pt-0.5">{tip}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs text-navy/40 text-center">
          Powered by {query.data?.source === 'openai' ? 'OpenAI GPT' : 'Heuristic Engine'} • Diperbarui{' '}
          {new Date(query.data?.generated_at || '').toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
