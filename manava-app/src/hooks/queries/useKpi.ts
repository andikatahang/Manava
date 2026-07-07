import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { MonthlyKpiPoint } from '../../types'

export function useMonthlyKpi() {
  return useQuery({
    queryKey: ['kpi', 'monthly'],
    queryFn: () => api<MonthlyKpiPoint[]>('/kpi/monthly'),
  })
}

export interface EditorMonthlyKpiPoint {
  editor_id: string
  editor_name: string
  department: string
  period: string
  kpi_average: number
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
}

export function useEditorMonthlyKpi() {
  return useQuery({
    queryKey: ['kpi', 'editors', 'monthly'],
    queryFn: () => api<EditorMonthlyKpiPoint[]>('/kpi/editors/monthly'),
  })
}

// Granularitas hari/minggu — dihitung langsung dari Review.rating +
// Review.created_at (data asli per kejadian review), bukan dari KpiSnapshot
// bulanan. Hanya rating klien yang tersedia di granularitas ini.
export interface ReviewTrendPoint {
  department: string
  period: string // "YYYY-MM-DD"
  avg_client_rating: number
  review_count: number
}

export function useKpiReviewsTrend(granularity: 'day' | 'week', enabled = true) {
  return useQuery({
    queryKey: ['kpi', 'reviews-trend', granularity],
    queryFn: () => api<ReviewTrendPoint[]>(`/kpi/reviews-trend?granularity=${granularity}`),
    enabled,
  })
}

export interface KpiRecommendation {
  department: string
  priority: 'high' | 'medium' | 'low'
  action: string
  rationale: string
  data_evidence: string[]
}
export interface KpiRecommendationResult {
  source: 'openai' | 'heuristic'
  summary: string
  recommendations: KpiRecommendation[]
  generated_at: string
}

export function useKpiRecommendation() {
  return useMutation({
    mutationFn: () => api<KpiRecommendationResult>('/kpi/recommendation', { method: 'POST' }),
  })
}
