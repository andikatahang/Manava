// Grafik tren KPI per departemen dengan pilihan granularitas Harian /
// Mingguan / Bulanan. Bulanan memakai KpiSnapshot (4 metrik: KPI rata-rata,
// rating klien, penyelesaian, rating manajer). Harian/Mingguan dihitung
// langsung dari Review.rating + Review.created_at (data asli per kejadian
// review) via /kpi/reviews-trend — satu-satunya komponen KPI dengan
// timestamp granular, jadi hanya rating klien yang tersedia di mode ini.

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useKpiReviewsTrend } from '../../hooks/queries/useKpi'
import type { MonthlyKpiPoint } from '../../types'

type Metric = 'kpi_average' | 'avg_client_rating' | 'completion_rate' | 'manager_rating'
type Granularity = 'day' | 'week' | 'month'
type RangeOption = '7d' | '30d' | '3m' | '6m' | '12m' | 'all'

const METRIC_LABEL: Record<Metric, string> = {
  kpi_average: 'KPI Rata-rata',
  avg_client_rating: 'Rating Klien',
  completion_rate: 'Penyelesaian (%)',
  manager_rating: 'Rating Manajer',
}

const GRANULARITY_LABEL: Record<Granularity, string> = {
  day: 'Harian',
  week: 'Mingguan',
  month: 'Bulanan',
}

const RANGE_LABEL: Record<RangeOption, string> = {
  '7d': '7 Hari',
  '30d': '30 Hari',
  '3m': '3 Bulan',
  '6m': '6 Bulan',
  '12m': '12 Bulan',
  all: 'Semua',
}

// Mapping range ke jumlah hari untuk kalkulasi filter
const RANGE_DAYS: Record<RangeOption, number | null> = {
  '7d': 7, '30d': 30, '3m': 90, '6m': 180, '12m': 365, all: null,
}

// Palet mengikuti tema navy + aksen — cukup kontras untuk 5 garis.
const LINE_COLORS = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed']

// Berapa bucket terakhir yang ditampilkan untuk hari/minggu agar grafik tetap terbaca.
const RECENT_BUCKETS: Record<'day' | 'week', number> = { day: 30, week: 12 }

function formatPeriod(period: string, granularity: Granularity): string {
  if (granularity === 'month') {
    const [y, m] = period.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const idx = Number(m) - 1
    return `${monthNames[idx] ?? m} ${(y ?? '').slice(2)}`
  }
  const d = new Date(`${period}T00:00:00Z`)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

// Hitung cutoff date berdasarkan range yang dipilih
function getDateCutoff(range: RangeOption): Date | null {
  const days = RANGE_DAYS[range]
  if (days === null) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - days)
  return now
}

// Parsing periode string ke Date
function parsePeriod(period: string): Date {
  const d = new Date(`${period}T00:00:00Z`)
  return d
}

// Filter periods berdasarkan date cutoff
function filterPeriodsByRange(periods: string[], range: RangeOption): string[] {
  const cutoff = getDateCutoff(range)
  if (!cutoff) return periods
  return periods.filter(p => parsePeriod(p) >= cutoff)
}

interface Props {
  points: MonthlyKpiPoint[]
}

export function KpiTrendChart({ points }: Props) {
  const [metric, setMetric] = useState<Metric>('kpi_average')
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [range, setRange] = useState<RangeOption>('6m')

  const reviewsTrendQuery = useKpiReviewsTrend(
    granularity === 'week' ? 'week' : 'day',
    granularity !== 'month',
  )

  const activeMetric: Metric = granularity === 'month' ? metric : 'avg_client_rating'

  const { rows, departments, rangeLabel } = useMemo(() => {
    if (granularity === 'month') {
      const allPeriods = Array.from(new Set(points.map(p => p.period))).sort()
      const visiblePeriods = new Set(filterPeriodsByRange(allPeriods, range))
      const filtered = points.filter(p => visiblePeriods.has(p.period))

      const deptSet = new Set(filtered.map(p => p.department))
      const depts = Array.from(deptSet).sort()
      const byPeriod = new Map<string, Record<string, number | string>>()
      for (const p of filtered) {
        const row = byPeriod.get(p.period) ?? { period: p.period, label: formatPeriod(p.period, granularity) }
        row[p.department] = p[metric]
        byPeriod.set(p.period, row)
      }
      const sortedRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
      const visibleArray = Array.from(visiblePeriods).sort()
      const label = visibleArray.length
        ? `${formatPeriod(visibleArray[0], granularity)}–${formatPeriod(visibleArray[visibleArray.length - 1], granularity)}`
        : '—'
      return { rows: sortedRows, departments: depts, rangeLabel: label }
    }

    const reviewPoints = reviewsTrendQuery.data ?? []
    const allPeriods = Array.from(new Set(reviewPoints.map(p => p.period))).sort()
    const recent = allPeriods.slice(-RECENT_BUCKETS[granularity])
    const filteredByRange = filterPeriodsByRange(recent, range)
    const rangeSet = new Set(filteredByRange)
    const filtered = reviewPoints.filter(p => rangeSet.has(p.period))
    const deptSet = new Set(filtered.map(p => p.department))
    const depts = Array.from(deptSet).sort()
    const byPeriod = new Map<string, Record<string, number | string>>()
    for (const p of filtered) {
      const row = byPeriod.get(p.period) ?? { period: p.period, label: formatPeriod(p.period, granularity) }
      row[p.department] = p.avg_client_rating
      byPeriod.set(p.period, row)
    }
    const sortedRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    const label = filteredByRange.length
      ? `${formatPeriod(filteredByRange[0], granularity)}–${formatPeriod(filteredByRange[filteredByRange.length - 1], granularity)}`
      : '—'
    return { rows: sortedRows, departments: depts, rangeLabel: label }
  }, [points, metric, granularity, range, reviewsTrendQuery.data])

  // Gerbang awal: kalau tidak pernah ada data bulanan sama sekali, jangan
  // tampilkan kartu ini sama sekali (perilaku asli). Setelah itu, kekosongan
  // data hari/minggu ditampilkan sebagai pesan di dalam kartu, bukan
  // menyembunyikan seluruh kartu — supaya selector granularitas tetap ada.
  if (points.length === 0) return null

  const yDomain: [number, number] = activeMetric === 'completion_rate' ? [50, 100] : [2, 5]
  const showEmptyState = granularity !== 'month' && !reviewsTrendQuery.isLoading && rows.length === 0

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Tren KPI per Departemen
          </p>
          <p className="text-sm text-navy/60 mt-1">
            Rata-rata {METRIC_LABEL[activeMetric].toLowerCase()} per departemen — {rangeLabel} ({GRANULARITY_LABEL[granularity].toLowerCase()}).
          </p>
          {granularity !== 'month' && (
            <p className="text-[11px] text-navy/40 mt-1">
              Granularitas ini dihitung dari data review klien asli — hanya rating klien yang tersedia (komponen KPI lain tidak punya riwayat harian/mingguan).
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={range}
            onChange={e => setRange(e.target.value as RangeOption)}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-navy/5 text-navy/70 border-none focus:outline-none focus:ring-1 focus:ring-navy/20 cursor-pointer"
          >
            {(Object.keys(RANGE_LABEL) as RangeOption[]).map(r => (
              <option key={r} value={r}>{RANGE_LABEL[r]}</option>
            ))}
          </select>
          <span className="w-px h-4 bg-navy/10" />
          <select
            value={granularity}
            onChange={e => setGranularity(e.target.value as Granularity)}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-navy/5 text-navy/70 border-none focus:outline-none focus:ring-1 focus:ring-navy/20 cursor-pointer"
          >
            {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map(g => (
              <option key={g} value={g}>{GRANULARITY_LABEL[g]}</option>
            ))}
          </select>
          {granularity === 'month' && (
            <>
              <span className="w-px h-4 bg-navy/10" />
              {(Object.keys(METRIC_LABEL) as Metric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    metric === m
                      ? 'bg-navy text-white'
                      : 'bg-navy/5 text-navy/60 hover:bg-navy/10'
                  }`}
                >
                  {METRIC_LABEL[m]}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {showEmptyState ? (
        <div className="h-72 flex items-center justify-center text-sm text-navy/40">
          Belum ada review klien untuk granularitas ini.
        </div>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value)
                  if (!Number.isFinite(n)) return '—'
                  return activeMetric === 'completion_rate' ? `${n}%` : n.toFixed(2)
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
              />
              {departments.map((dept, i) => (
                <Line
                  key={dept}
                  type="monotone"
                  dataKey={dept}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
