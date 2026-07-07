// Grafik tren KPI bulan-ke-bulan per editor (satu garis per anggota). Dipakai
// di Admin Manager dashboard untuk melihat perkembangan tiap anggota dalam
// departemennya.

import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { EditorMonthlyKpiPoint } from '../../hooks/queries/useKpi'

type Metric = 'kpi_average' | 'avg_client_rating' | 'completion_rate' | 'manager_rating'
type RangeOption = '3m' | '6m' | '12m' | 'all'

const METRIC_LABEL: Record<Metric, string> = {
  kpi_average: 'KPI Rata-rata',
  avg_client_rating: 'Rating Klien',
  completion_rate: 'Penyelesaian (%)',
  manager_rating: 'Rating Manajer',
}

const RANGE_LABEL: Record<RangeOption, string> = {
  '3m': '3 Bulan',
  '6m': '6 Bulan',
  '12m': '12 Bulan',
  all: 'Semua',
}
const RANGE_MONTHS: Record<RangeOption, number | null> = {
  '3m': 3, '6m': 6, '12m': 12, all: null,
}

// Palet luas: sampai 12 editor terlihat berbeda cukup jelas.
const LINE_COLORS = [
  '#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#c026d3', '#65a30d', '#e11d48', '#0d9488', '#a16207',
]

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const idx = Number(m) - 1
  return `${monthNames[idx] ?? m} ${(y ?? '').slice(2)}`
}

interface Props {
  points: EditorMonthlyKpiPoint[]
  department?: string  // filter opsional (untuk manager dengan >1 dept)
  title?: string
  subtitle?: string
}

export function EditorKpiTrendChart({ points, department, title, subtitle }: Props) {
  const [metric, setMetric] = useState<Metric>('kpi_average')
  const [range, setRange] = useState<RangeOption>('6m')

  const filtered = useMemo(
    () => (department ? points.filter(p => p.department === department) : points),
    [points, department],
  )

  const { rows, editors, rangeLabel } = useMemo(() => {
    const allPeriods = Array.from(new Set(filtered.map(p => p.period))).sort()
    const n = RANGE_MONTHS[range]
    const visiblePeriods = new Set(n ? allPeriods.slice(-n) : allPeriods)
    const rangeFiltered = filtered.filter(p => visiblePeriods.has(p.period))

    const editorSet = new Map<string, string>()
    for (const p of rangeFiltered) editorSet.set(p.editor_id, p.editor_name)
    const editorList = Array.from(editorSet.entries()).sort((a, b) => a[1].localeCompare(b[1]))

    const byPeriod = new Map<string, Record<string, number | string>>()
    for (const p of rangeFiltered) {
      const row = byPeriod.get(p.period) ?? { period: p.period, label: formatPeriod(p.period) }
      row[p.editor_name] = p[metric]
      byPeriod.set(p.period, row)
    }
    const sortedRows = Array.from(byPeriod.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period)),
    )
    const sortedVisible = Array.from(visiblePeriods).sort()
    const label = sortedVisible.length
      ? `${formatPeriod(sortedVisible[0])}–${formatPeriod(sortedVisible[sortedVisible.length - 1])}`
      : '—'
    return { rows: sortedRows, editors: editorList.map(([, name]) => name), rangeLabel: label }
  }, [filtered, metric, range])

  if (filtered.length === 0) return null

  const yDomain: [number, number] = metric === 'completion_rate' ? [50, 100] : [2, 5]

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> {title ?? 'Perkembangan KPI Anggota Departemen'}
          </p>
          <p className="text-sm text-navy/60 mt-1">
            {subtitle ?? `Rata-rata ${METRIC_LABEL[metric].toLowerCase()} per anggota — ${rangeLabel}.`}
          </p>
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
          {(Object.keys(METRIC_LABEL) as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                metric === m ? 'bg-navy text-white' : 'bg-navy/5 text-navy/60 hover:bg-navy/10'
              }`}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value)
                if (!Number.isFinite(n)) return '—'
                return metric === 'completion_rate' ? `${n}%` : n.toFixed(2)
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
            {editors.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
