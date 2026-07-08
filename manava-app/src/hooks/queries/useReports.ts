// Frontend hooks untuk department reports

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { DepartmentReportData, CreateReportRequest, ReportListResponse } from '../../types'

/**
 * Fetch list of department reports
 * - HR Admin: lihat semua reports
 * - Admin Manager: hanya lihat reports departemen mereka
 */
export function useReports(filters?: { period?: string; department_id?: string }) {
  const params = new URLSearchParams()
  if (filters?.period) params.append('period', filters.period)
  if (filters?.department_id) params.append('department_id', filters.department_id)

  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const url = `/reports${params.toString() ? `?${params.toString()}` : ''}`
      return api<ReportListResponse[]>(url)
    },
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
 * Generate and submit a department report
 */
export function useReportMutations() {
  const queryClient = useQueryClient()

  const createReport = useMutation({
    mutationFn: async (data: CreateReportRequest) => {
      return api<DepartmentReportData>('/reports', {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  return { createReport }
}
