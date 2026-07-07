// Hook untuk mengambil data KPI trend personal editor (untuk halaman ESS)

import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface MyKpiTrendPoint {
  period: string // "YYYY-MM-DD" untuk day/week, "YYYY-MM" untuk month
  kpi_average: number | null
  avg_client_rating: number | null
  completion_rate: number | null
  manager_rating: number | null
  review_count: number
  project_count: number
}

export type KpiGranularity = 'day' | 'week' | 'month'

export function useMyKpiTrend(granularity: KpiGranularity = 'month') {
  return useQuery({
    queryKey: ['my-kpi-trend', granularity],
    queryFn: async () => {
      const res = await api<MyKpiTrendPoint[]>(`/kpi/my-trend?granularity=${granularity}`)
      return res ?? []
    },
  })
}

