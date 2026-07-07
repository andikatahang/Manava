// Panel rekomendasi keputusan HR berbasis tren KPI. Memanggil endpoint
// /kpi/recommendation (OpenAI dengan fallback heuristik) dan menampilkan
// ringkasan + daftar tindakan berprioritas.

import { Sparkles, AlertTriangle, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react'
import { useKpiRecommendation, type KpiRecommendation } from '../../hooks/queries/useKpi'

const PRIORITY_META: Record<KpiRecommendation['priority'], { label: string; badge: string; icon: typeof AlertTriangle }> = {
  high:   { label: 'Prioritas Tinggi',  badge: 'bg-red-50 text-red-700 border-red-200',       icon: AlertTriangle },
  medium: { label: 'Prioritas Sedang',  badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: TrendingUp },
  low:    { label: 'Prioritas Rendah',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Sparkles },
}

export function KpiRecommendationCard() {
  const { mutate, data, isPending, isError, error, reset } = useKpiRecommendation()

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Rekomendasi Keputusan HR
          </p>
          <p className="text-sm text-navy/60 mt-1">
            Rekomendasi berbasis tren KPI 6 bulan per departemen — dihasilkan oleh model AI
            saat OpenAI dikonfigurasi, atau ringkasan deterministik jika tidak.
          </p>
        </div>
        <button
          onClick={() => { reset(); mutate() }}
          disabled={isPending}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menghitung…</>
          ) : data ? (
            <><RefreshCw className="w-3.5 h-3.5" /> Perbarui</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Minta Rekomendasi AI</>
          )}
        </button>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">
          Gagal memuat rekomendasi — {(error as Error)?.message ?? 'terjadi kesalahan.'}
        </div>
      )}

      {!data && !isPending && !isError && (
        <p className="text-sm text-navy/40 italic">
          Klik "Minta Rekomendasi AI" untuk menghasilkan ringkasan dan tindakan yang disarankan.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <div className="rounded-xl bg-navy text-white p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60 mb-1.5">
              <span>Ringkasan</span>
              <span>{data.source === 'openai' ? 'Dihasilkan OpenAI' : 'Ringkasan Deterministik'}</span>
            </div>
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </div>

          <div className="space-y-2">
            {data.recommendations.map((r, i) => {
              const meta = PRIORITY_META[r.priority] ?? PRIORITY_META.low
              const Icon = meta.icon
              return (
                <div key={i} className="rounded-xl border border-border p-3.5 flex gap-3">
                  <span className={`shrink-0 w-8 h-8 rounded-full border ${meta.badge} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-navy">{r.department}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-navy flex items-start gap-1">
                      <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-navy/40" />
                      <span>{r.action}</span>
                    </p>
                    <p className="text-xs text-navy/55 mt-1 pl-5">{r.rationale}</p>
                    {r.data_evidence && r.data_evidence.length > 0 && (
                      <div className="pl-5 mt-2 flex flex-wrap gap-1.5">
                        {r.data_evidence.map((ev, k) => (
                          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full bg-navy/5 text-navy/70 text-[11px] font-medium border border-navy/10">
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {data.recommendations.length === 0 && (
              <p className="text-sm text-navy/40 italic">Model tidak menghasilkan rekomendasi eksplisit — tren KPI aman.</p>
            )}
          </div>

          <p className="text-[11px] text-navy/40">
            Diperbarui {new Date(data.generated_at).toLocaleString('id-ID')} · Sumber:{' '}
            {data.source === 'openai' ? 'OpenAI gpt-4o-mini' : 'Heuristik lokal (OPENAI_API_KEY belum diatur)'}
          </p>
        </div>
      )}
    </div>
  )
}
