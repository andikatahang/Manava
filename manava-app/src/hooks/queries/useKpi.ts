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
