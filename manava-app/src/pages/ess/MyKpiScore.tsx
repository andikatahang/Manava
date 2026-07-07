// Tampilan KPI Score personal editor di halaman ESS
// Layout: AI Insight (top) → Filter & Stats → Grafik (kiri) + Tabel Sortable (kanan)

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, ArrowUpDown } from 'lucide-react'
import { useMyKpiTrend, type KpiGranularity } from '../../hooks/queries/useMyKpiTrend'
import { KpiInsightCard } from './KpiInsightCard'

const GRANULARITIES: { id: KpiGranularity; label: string }[] = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' },
]

type SortColumn = 'period' | 'rating' | 'reviews' | 'projects'
type SortDirection = 'asc' | 'desc'

export function MyKpiScore() {
  const [granularity, setGranularity] = useState<KpiGranularity>('month')
  const [sortColumn, setSortColumn] = useState<SortColumn>('period')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const query = useMyKpiTrend(granularity)

  const data = query.data ?? []
  const isLoading = query.isLoading

  // Format periode untuk tampilan yang lebih readable
  function formatPeriod(period: string, granularity: KpiGranularity): string {
    if (granularity === 'month') {
      // "2026-07" → "Juli 2026"
      const [year, month] = period.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    } else if (granularity === 'week') {
      // "2026-07-06" (Senin minggu itu) → "6-12 Jul 2026"
      const date = new Date(period + 'T00:00:00')
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 6)
      const day1 = date.getDate()
      const day2 = endDate.getDate()
      const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][date.getMonth()]
      const year = date.getFullYear()
      return `${day1}-${day2} ${monthAbbr} ${year}`
    } else {
      // "2026-07-08" → "8 Jul 2026"
      const date = new Date(period + 'T00:00:00')
      const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][date.getMonth()]
      return `${date.getDate()} ${monthAbbr} ${date.getFullYear()}`
    }
  }

  // Tambahkan label readable ke data untuk chart
  const chartData = data.map((item: typeof data[0]) => ({
    ...item,
    periodLabel: formatPeriod(item.period, granularity),
  }))

  // Handle sorting
  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      // Toggle direction jika klik column yang sama
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Reset ke asc jika klik column baru
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort tabel data
  const sortedChartData = [...chartData].sort((a, b) => {
    let compareA: any = a
    let compareB: any = b

    if (sortColumn === 'period') {
      compareA = a.period
      compareB = b.period
    } else if (sortColumn === 'rating') {
      compareA = a.avg_client_rating ?? 0
      compareB = b.avg_client_rating ?? 0
    } else if (sortColumn === 'reviews') {
      compareA = a.review_count
      compareB = b.review_count
    } else if (sortColumn === 'projects') {
      compareA = a.project_count
      compareB = b.project_count
    }

    let result = 0
    if (compareA < compareB) result = -1
    else if (compareA > compareB) result = 1

    return sortDirection === 'asc' ? result : -result
  })

  const avgClientRating = data.length > 0
    ? Math.round((data.reduce((sum: number, d: typeof data[0]) => sum + (d.avg_client_rating || 0), 0) / data.filter((d: typeof data[0]) => d.avg_client_rating).length) * 100) / 100
    : 0

  const totalProjects = data.reduce((sum: number, d: typeof data[0]) => sum + d.project_count, 0)
  const totalReviews = data.reduce((sum: number, d: typeof data[0]) => sum + d.review_count, 0)

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1.5 text-left hover:text-navy transition-colors group"
    >
      <span className="text-xs font-semibold text-navy/70 group-hover:text-navy">{label}</span>
      <ArrowUpDown
        className={`w-3.5 h-3.5 transition-all ${
          sortColumn === column
            ? sortDirection === 'asc'
              ? 'text-navy rotate-0'
              : 'text-navy rotate-180'
            : 'text-navy/20'
        }`}
      />
    </button>
  )

  return (
    <div className="space-y-6 max-w-7xl">
      {/* AI Insight Card - Prominent di awal */}
      <KpiInsightCard />

      {/* Filter Granularitas */}
      <div className="flex gap-2">
        {GRANULARITIES.map(g => (
          <button
            key={g.id}
            onClick={() => setGranularity(g.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              granularity === g.id
                ? 'bg-navy text-white'
                : 'bg-white border border-border text-navy/60 hover:text-navy'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-navy/60 mb-1">Rating Klien Rata-rata</p>
          <p className="text-2xl font-bold text-navy">{avgClientRating.toFixed(2)}</p>
          <p className="text-xs text-navy/50 mt-1">dari 5.0</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-navy/60 mb-1">Total Proyek</p>
          <p className="text-2xl font-bold text-navy">{totalProjects}</p>
          <p className="text-xs text-navy/50 mt-1">dalam periode</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-navy/60 mb-1">Ulasan Klien</p>
          <p className="text-2xl font-bold text-navy">{totalReviews}</p>
          <p className="text-xs text-navy/50 mt-1">diterima</p>
        </div>
      </div>

      {/* Grafik & Tabel Side-by-Side */}
      {isLoading ? (
        <div className="card h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
            <p className="text-sm text-navy/60 mt-3">Memuat data...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="card text-center py-16">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-navy/20" />
          <p className="text-sm font-semibold text-navy">Belum ada data KPI</p>
          <p className="text-xs text-navy/50 mt-1">
            Riwayat KPI akan muncul setelah ada review dari klien untuk proyek Anda.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Grafik Tren - Kiri */}
          <div className="card p-6 bg-white">
            <h3 className="text-sm font-semibold text-navy mb-4">Tren Rating</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="periodLabel"
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  domain={[0, 5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => (value !== null ? value.toFixed(2) : 'N/A')}
                />
                <Legend />
                {data.some((d: typeof data[0]) => d.avg_client_rating !== null) && (
                  <Line
                    type="monotone"
                    dataKey="avg_client_rating"
                    stroke="#1e40af"
                    dot={{ fill: '#1e40af', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Rating Klien"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel History Detail - Kanan */}
          <div className="card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-navy/2.5 flex-shrink-0">
              <h3 className="text-sm font-semibold text-navy">Riwayat Detail (Sortable)</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-navy/5 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left">
                      <SortHeader column="period" label="Periode" />
                    </th>
                    <th className="px-4 py-2.5 text-center">
                      <SortHeader column="rating" label="Rating" />
                    </th>
                    <th className="px-4 py-2.5 text-center">
                      <SortHeader column="reviews" label="Ulasan" />
                    </th>
                    <th className="px-4 py-2.5 text-center">
                      <SortHeader column="projects" label="Proyek" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChartData.map((row: typeof sortedChartData[0], idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-navy/2.5'}>
                      <td className="px-4 py-2.5 text-navy font-medium text-xs">{row.periodLabel}</td>
                      <td className="px-4 py-2.5 text-center">
                        {row.avg_client_rating !== null ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-900 font-semibold text-xs">
                            {row.avg_client_rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-navy/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-navy/70 text-xs">{row.review_count}</td>
                      <td className="px-4 py-2.5 text-center text-navy/70 text-xs">{row.project_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
