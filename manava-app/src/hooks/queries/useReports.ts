// Frontend hooks untuk department reports (alur MIS: draft otomatis → teruskan ke HR)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type {
  DepartmentReportData, DraftReportData, ForwardReportRequest, ReportListResponse,
} from '../../types'

/**
 * Fetch list of department reports
 * - HR Admin: laporan yang sudah diteruskan (forwarded)
 * - Admin Manager: laporan departemen mereka
 */
export function useReports(filters?: { period?: string; department_id?: string; status?: string }) {
  const params = new URLSearchParams()
  if (filters?.period) params.append('period', filters.period)
  if (filters?.department_id) params.append('department_id', filters.department_id)
  if (filters?.status) params.append('status', filters.status)

  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const url = `/reports${params.toString() ? `?${params.toString()}` : ''}`
      return api<ReportListResponse[]>(url)
    },
  })
}

/**
 * Draft laporan bulanan departemen (Admin Manager) — di-agregasi otomatis
 * oleh sistem dari aktivitas harian editor.
 */
export function useDraftReport(period: string, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'draft', period],
    queryFn: () => api<DraftReportData>(`/reports/draft?period=${period}`),
    enabled: !!period && enabled,
  })
}

/**
 * Fetch single report detail
 */
export function useReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['reports', reportId],
    queryFn: () => api<DepartmentReportData>(`/reports/${reportId}`),
    enabled: !!reportId,
  })
}

/**
 * Teruskan draft laporan ke HR Admin (membekukan snapshot metrik)
 */
export function useReportMutations() {
  const queryClient = useQueryClient()

  const forwardReport = useMutation({
    mutationFn: async (data: ForwardReportRequest) => {
      return api<DepartmentReportData>('/reports/forward', {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  return { forwardReport }
}
