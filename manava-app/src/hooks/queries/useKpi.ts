import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { MonthlyKpiPoint } from '../../types'

export function useMonthlyKpi() {
  return useQuery({
    queryKey: ['kpi', 'monthly'],
    queryFn: () => api<MonthlyKpiPoint[]>('/kpi/monthly'),
  })
}
