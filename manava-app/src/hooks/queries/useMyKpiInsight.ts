// Hook untuk fetch AI Insight personal editor dari ESS

import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export interface EditorInsight {
  summary: string
  performance_level: 'excellent' | 'good' | 'needs_improvement'
  trend: 'improving' | 'stable' | 'declining'
  key_strengths: string[]
  areas_for_improvement: string[]
  actionable_tips: string[]
  motivational_message: string
}

export interface EditorInsightResponse {
  source: 'openai' | 'heuristic'
  insight: EditorInsight
  generated_at: string
}

export function useMyKpiInsight() {
  return useQuery({
    queryKey: ['my-kpi-insight'],
    queryFn: async () => {
      const res = await api<EditorInsightResponse>('/kpi/my-insight', {
        method: 'POST',
      })
      return res
    },
    staleTime: 1000 * 60 * 60, // Cache 1 jam
    retry: 1,
  })
}
