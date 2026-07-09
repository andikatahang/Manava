import { useMemo, useState, type ComponentType } from 'react'
import {
  Star, TrendingUp, Target, Award,
  Users, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import { useMe } from '../../hooks/queries/useMe'
import { useEditors, useEditorMutations } from '../../hooks/queries/useEditors'
import { useDepartments } from '../../hooks/queries/useDepartments'
import { useMonthlyKpi } from '../../hooks/queries/useKpi'
import { KpiTrendChart } from './KpiTrendChart'
import { ApiError } from '../../lib/api'
import type { EditorMetrics, UserRole } from '../../types'

type Tone = 'navy' | 'emerald' | 'amber' | 'red'


const BAND_META: Record<EditorMetrics['performance_band'], { color: string; bg: string; label: string }> = {
  excellent:         { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Sangat Baik' },
  good:              { color: 'text-blue-700',    bg: 'bg-blue-50',    label: 'Baik' },
  needs_improvement: { color: 'text-red-700',     bg: 'bg-red-50',     label: 'Perlu Peningkatan' },
}

const RANK_BADGE = ['bg-amber-400 text-white', 'bg-gray-300 text-gray-700', 'bg-amber-600 text-white']

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="ml-1 text-sm font-semibold text-navy">{value.toFixed(1)}</span>
    </div>
  )
}

function KpiGauge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const pct = (value / 5) * 100
  const color = value >= 4.5 ? '#10b981' : value >= 3.5 ? '#3b82f6' : '#ef4444'
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const dim = size === 'sm' ? 'w-20 h-20' : 'w-28 h-28'
  return (
    <div className={`relative mx-auto ${dim}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8edf2" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={size === 'sm' ? 'text-lg font-bold text-navy' : 'text-2xl font-bold text-navy'}>{value.toFixed(1)}</span>
        <span className="text-xs text-navy/40">/ 5.0</span>
      </div>
    </div>
  )
}

const TONE_CLASS: Record<Tone, string> = {
  navy: 'text-navy',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

function StatBox({
  icon: Icon, label, value, tone = 'navy',
}: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; tone?: Tone }) {
  return (
    <div className="card py-4 px-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${TONE_CLASS[tone]}`} />
        <span className="text-xs text-navy/55">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${TONE_CLASS[tone]}`}>{value}</p>
    </div>
  )
}

function SignalCard({
  tone, icon: Icon, title, hint,
}: { tone: Tone; icon: ComponentType<{ className?: string }>; title: string; hint: string }) {
  const palette: Record<Tone, string> = {
    navy: 'bg-navy text-white',
    emerald: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    red: 'bg-red-600 text-white',
  }
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${palette[tone]}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{hint}</p>
      </div>
    </div>
  )
}

function EditorRow({
  metrics, rank, active, onClick,
}: { metrics: EditorMetrics; rank: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left card transition-all px-4 py-3 ${active ? 'border-navy ring-1 ring-navy/20' : 'hover:border-navy/20'}`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${RANK_BADGE[rank] ?? 'bg-navy/10 text-navy/60'}`}>
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy truncate">{metrics.editor_name}</p>
            <span className="text-sm font-bold text-navy shrink-0">{metrics.kpi_average.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
            <div className="bg-navy h-1 rounded-full" style={{ width: `${(metrics.kpi_average / 5) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-navy/55">
              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{metrics.avg_client_rating.toFixed(1)}</span>
              <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{metrics.completion_rate}%</span>
              <span className="flex items-center gap-0.5"><Target className="w-3 h-3" />{metrics.manager_rating.toFixed(1)}</span>
            </div>
            <StatusBadge status={metrics.performance_band} />
          </div>
        </div>
      </div>
    </button>
  )
}

function DetailBody({ metrics }: { metrics: EditorMetrics }) {
  const bandMeta = BAND_META[metrics.performance_band]

  const radarData = [
    { metric: 'Rating Klien', value: (metrics.avg_client_rating / 5) * 100 },
    { metric: 'Penyelesaian', value: metrics.completion_rate },
    { metric: 'Manajer', value: (metrics.manager_rating / 5) * 100 },
  ]

  return (
    <div className="space-y-5">
      {/* Subject + gauge */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center text-white text-sm font-bold shrink-0">
          {metrics.editor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-navy truncate">{metrics.editor_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bandMeta.bg} ${bandMeta.color}`}>
              <Award className="w-3 h-3" /> {bandMeta.label}
            </span>
          </div>
        </div>
        <KpiGauge value={metrics.kpi_average} />
      </div>

      {/* Breakdown tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Rating Klien', value: metrics.avg_client_rating, icon: Star, color: 'text-amber-500', fmt: (v: number) => `${v.toFixed(1)}` },
          { label: 'Penyelesaian', value: metrics.completion_rate, icon: TrendingUp, color: 'text-blue-500', fmt: (v: number) => `${v}%` },
          { label: 'Manajer', value: metrics.manager_rating, icon: Target, color: 'text-navy/60', fmt: (v: number) => `${v.toFixed(1)}` },
        ].map(({ label, value, icon: Icon, color, fmt }) => (
          <div key={label} className="bg-navy/5 border border-navy/10 rounded-xl p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className="text-lg font-bold text-navy leading-tight">{fmt(value)}</p>
            <p className="text-[11px] text-navy/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Radar */}
      <div>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">Dimensi KPI</p>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <PolarGrid stroke="#e8edf2" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#022E5799' }} />
            <Radar dataKey="value" stroke="#022E57" fill="#022E57" fillOpacity={0.15} strokeWidth={2} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Client satisfaction */}
      <div>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Kepuasan Klien</p>
        <div className="flex items-start gap-4">
          <div className="text-center shrink-0">
            <p className="text-3xl font-bold text-navy leading-none">{metrics.avg_client_rating.toFixed(1)}</p>
            <StarRating value={metrics.avg_client_rating} />
            <p className="text-[11px] text-navy/40 mt-1">Rata-rata proyek</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const rounded = Math.round(metrics.avg_client_rating)
              const frac = star === rounded ? 0.55
                : star === rounded + 1 ? 0.25
                : star === rounded - 1 ? 0.15
                : 0.03
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-navy/50 w-3">{star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${frac * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-navy/40 w-7 text-right">{Math.round(frac * 100)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PerformancePage({ role }: { role: UserRole; embedded?: boolean }) {
  const isManager = role === 'superadmin' || role === 'admin_manager'
  const canRate = isManager

  // Metrics ride along on GET /editors; an Admin Manager only sees the
  // editors of departments they manage, HR/superadmin see everyone.
  const meQuery = useMe()
  const editorsQuery = useEditors()
  const departmentsQuery = useDepartments()
  // Agregat KPI departemen hanya untuk level taktis/strategis (editor: 403).
  const kpiTrendQuery = useMonthlyKpi(role !== 'editor')
  const scopedEditors = useMemo(() => {
    const editors = editorsQuery.data ?? []
    if (role !== 'admin_manager') return editors
    const myDeptEditorIds = new Set(
      (departmentsQuery.data ?? [])
        .filter(d => d.manager.user_id === meQuery.data?.user_id)
        .flatMap(d => d.member_ids),
    )
    return editors.filter(e => myDeptEditorIds.has(e.editor_id))
  }, [editorsQuery.data, departmentsQuery.data, meQuery.data, role])

  const allMetrics = useMemo(
    () => scopedEditors.map(e => e.metrics).filter((m): m is EditorMetrics => !!m),
    [scopedEditors],
  )
  const sorted = useMemo(() => [...allMetrics].sort((a, b) => b.kpi_average - a.kpi_average), [allMetrics])

  const myEditor = (editorsQuery.data ?? []).find(e => e.user_id === meQuery.data?.user_id)
  const myMetrics = myEditor?.metrics ?? null
  const [selected, setSelected] = useState<EditorMetrics | null>(null)
  const [ratingModal, setRatingModal] = useState(false)
  const [draftRating, setDraftRating] = useState(3)
  const [ratingNote, setRatingNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const { setManagerRating } = useEditorMutations()

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const counts = {
    total: allMetrics.length,
    excellent: allMetrics.filter(e => e.performance_band === 'excellent').length,
    good: allMetrics.filter(e => e.performance_band === 'good').length,
    needs: allMetrics.filter(e => e.performance_band === 'needs_improvement').length,
  }

  const openDetail = (m: EditorMetrics) => {
    setSelected(m)
    setDraftRating(m.manager_rating)
    setRatingNote('')
  }

  // Persists via PATCH /editors/:id/metrics — success feedback only after the
  // server confirms; the drawer refreshes with the recomputed KPI + band.
  const handleSubmitRating = () => {
    if (!selected) return
    setManagerRating.mutate(
      { editorId: selected.editor_id, rating: draftRating },
      {
        onSuccess: metrics => {
          setSelected(metrics)
          setRatingModal(false)
          flash(`Manager Assessment ${metrics.editor_name} tersimpan — KPI ${metrics.kpi_average.toFixed(2)}/5.`)
        },
        onError: err => {
          setRatingModal(false)
          flash(err instanceof ApiError ? err.message : 'Gagal menyimpan rating — coba lagi')
        },
      },
    )
  }

  // Editor view — focused single-subject layout, no list/drawer
  if (role === 'editor') {
    if (!myMetrics) {
      return (
        <div className="card text-center py-12 text-sm text-navy/50">
          Belum ada data KPI untuk akun Anda.
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <SignalCard
          tone={myMetrics.performance_band === 'excellent' ? 'emerald' : myMetrics.performance_band === 'good' ? 'navy' : 'amber'}
          icon={Sparkles}
          title={`KPI Anda — ${myMetrics.kpi_average.toFixed(2)} / 5.0`}
          hint={`Band: ${BAND_META[myMetrics.performance_band].label}. Skor ini menjadi basis bonus proyek kuartal berikutnya.`}
        />
        <div className="card">
          <DetailBody metrics={myMetrics} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Signal */}
      {canRate && counts.needs > 0 && (
        <SignalCard
          tone="amber"
          icon={AlertTriangle}
          title={`${counts.needs} editor butuh evaluasi`}
          hint="Buka detail untuk meninjau tren dan kirim Manager Assessment Q2 2026."
        />
      )}
      {canRate && counts.needs === 0 && (
        <SignalCard
          tone="emerald"
          icon={CheckCircle2}
          title="Tidak ada editor di band Perlu Peningkatan"
          hint="Tim Anda berada di band Baik atau Sangat Baik kuartal ini."
        />
      )}

      {/* Tren KPI bulanan per departemen */}
      {kpiTrendQuery.data && kpiTrendQuery.data.length > 0 && (
        <KpiTrendChart points={kpiTrendQuery.data} />
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon={Users} label="Total Editor" value={counts.total} tone="navy" />
        <StatBox icon={Award} label="Sangat Baik" value={counts.excellent} tone="emerald" />
        <StatBox icon={Target} label="Baik" value={counts.good} tone="navy" />
        <StatBox icon={AlertTriangle} label="Perlu Peningkatan" value={counts.needs} tone="red" />
      </div>

      {/* Rankings */}
      <div>
        <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Peringkat — Q2 2026
        </p>
        <div className="space-y-2">
          {sorted.map((e, i) => (
            <EditorRow
              key={e.editor_id}
              metrics={e}
              rank={i}
              active={selected?.editor_id === e.editor_id}
              onClick={() => openDetail(e)}
            />
          ))}
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.editor_name ?? ''}
        subtitle={selected ? 'Tinjauan Q2 2026' : undefined}
        size="lg"
        footer={
          canRate && selected ? (
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setSelected(null)} className="btn-secondary">Tutup</button>
              <button onClick={() => setRatingModal(true)} className="btn-primary">
                <Target className="w-3.5 h-3.5" /> Beri Manager Assessment
              </button>
            </div>
          ) : null
        }
      >
        {selected && <DetailBody metrics={selected} />}
      </Drawer>

      {/* Rating modal */}
      {selected && (
        <Modal open={ratingModal} onClose={() => setRatingModal(false)} title={`Nilai ${selected.editor_name}`}>
          <div className="space-y-4">
            <p className="text-sm text-navy/60">
              Manager Assessment kuartalan. Berkontribusi <span className="font-semibold text-navy">1/3</span> dari total skor KPI.
            </p>

            <div>
              <label className="label">Rating Manajer (1,0 – 5,0)</label>
              <input
                type="range" min="1" max="5" step="0.1"
                value={draftRating}
                onChange={e => setDraftRating(Number(e.target.value))}
                className="w-full accent-navy"
              />
              <div className="flex justify-between text-xs text-navy/50 mt-1">
                <span>1,0 — Buruk</span>
                <span className="font-bold text-navy text-sm">{draftRating.toFixed(1)}</span>
                <span>5,0 — Luar Biasa</span>
              </div>
              <div className="flex justify-center mt-2">
                <StarRating value={draftRating} />
              </div>
            </div>

            <div>
              <label className="label">Catatan Tinjauan</label>
              <textarea
                rows={3}
                value={ratingNote}
                onChange={e => setRatingNote(e.target.value)}
                className="input resize-none"
                placeholder="Ringkas sorotan kinerja, area yang perlu ditingkatkan..."
              />
            </div>

            <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium text-navy">Proyeksi Dampak KPI</p>
              <div className="flex justify-between text-navy/60 text-xs">
                <span>Rating Klien ({selected.avg_client_rating.toFixed(1)})</span>
                <span>{((selected.avg_client_rating / 5) * 33.3).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-navy/60 text-xs">
                <span>Penyelesaian ({selected.completion_rate}%)</span>
                <span>{(selected.completion_rate / 100 * 33.3).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-navy/60 text-xs">
                <span>Manajer ({draftRating.toFixed(1)})</span>
                <span>{((draftRating / 5) * 33.3).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between font-semibold text-navy text-xs border-t border-border pt-1 mt-1">
                <span>Estimasi KPI Baru</span>
                <span>{(((selected.avg_client_rating / 5) + (selected.completion_rate / 100) + (draftRating / 5)) / 3 * 5).toFixed(2)} / 5.0</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setRatingModal(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSubmitRating}
                disabled={setManagerRating.isPending}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {setManagerRating.isPending ? 'Menyimpan…' : 'Kirim Rating'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-navy text-white px-4 py-2.5 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
