// Grafik tren KPI bulan-ke-bulan per departemen. Satu garis per departemen,
// pilihan metrik dapat ditukar (KPI rata-rata / rating klien / penyelesaian /
// rating manajer). Tersembunyi otomatis kalau backend belum mengembalikan data.

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { MonthlyKpiPoint } from '../../types'

type Metric = 'kpi_average' | 'avg_client_rating' | 'completion_rate' | 'manager_rating'

const METRIC_LABEL: Record<Metric, string> = {
  kpi_average: 'KPI Rata-rata',
  avg_client_rating: 'Rating Klien',
  completion_rate: 'Penyelesaian (%)',
  manager_rating: 'Rating Manajer',
}

// Palet mengikuti tema navy + aksen — cukup kontras untuk 5 garis.
const LINE_COLORS = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed']

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const idx = Number(m) - 1
  return `${monthNames[idx] ?? m} ${(y ?? '').slice(2)}`
}

interface Props {
  points: MonthlyKpiPoint[]
}

export function KpiTrendChart({ points }: Props) {
  const [metric, setMetric] = useState<Metric>('kpi_average')

  // Pivot ke bentuk { period, [dept1]: value, [dept2]: value, ... } — bentuk
  // yang dikonsumsi Recharts untuk satu garis per departemen.
  const { rows, departments } = useMemo(() => {
    const deptSet = new Set(points.map(p => p.department))
    const depts = Array.from(deptSet).sort()
    const byPeriod = new Map<string, Record<string, number | string>>()
    for (const p of points) {
      const row = byPeriod.get(p.period) ?? { period: p.period, label: formatPeriod(p.period) }
      row[p.department] = p[metric]
      byPeriod.set(p.period, row)
    }
    const sortedRows = Array.from(byPeriod.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period)),
    )
    return { rows: sortedRows, departments: depts }
  }, [points, metric])

  if (points.length === 0) return null

  const yDomain: [number, number] = metric === 'completion_rate' ? [50, 100] : [2, 5]

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Tren KPI Bulanan per Departemen
          </p>
          <p className="text-sm text-navy/60 mt-1">
            Rata-rata {METRIC_LABEL[metric].toLowerCase()} per departemen — Jan–Jun 2026.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
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
        </div>
      </div>

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
              formatter={(value: number) =>
                metric === 'completion_rate' ? `${value}%` : value.toFixed(2)
              }
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
    </div>
  )
}
