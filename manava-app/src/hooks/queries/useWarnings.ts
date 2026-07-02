import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type WarningSeverity = 'ringan' | 'sedang' | 'berat'
export type WarningStatus = 'aktif' | 'diakui' | 'kedaluwarsa'
export type WarningTargetRole = 'editor' | 'admin_manager'

// Page-facing shape (camelCase, dates as YYYY-MM-DD) — matches what
// WarningPage rendered from its previous in-file mock.
export interface Warning {
  id: string
  targetName: string
  targetRole: WarningTargetRole
  reason: string
  severity: WarningSeverity
  status: WarningStatus
  issuedBy: string
  issuedAt: string
  expiresAt: string
}

interface ApiWarning {
  id: string
  target_name: string
  target_role: WarningTargetRole
  reason: string
  severity: WarningSeverity
  status: WarningStatus
  issued_at: string
  expires_at: string
  issuer: { full_name: string }
}

function toWarning(w: ApiWarning): Warning {
  return {
    id: w.id,
    targetName: w.target_name,
    targetRole: w.target_role,
    reason: w.reason,
    severity: w.severity,
    status: w.status,
    issuedBy: w.issuer.full_name,
    issuedAt: w.issued_at.slice(0, 10),
    expiresAt: w.expires_at.slice(0, 10),
  }
}

const KEY = ['warnings']

export function useWarnings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const rows = await api<ApiWarning[]>('/warnings')
      return rows.map(toWarning)
    },
  })
}

export function useWarningMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (input: {
      target_name: string
      target_role: WarningTargetRole
      reason: string
      severity: WarningSeverity
    }) => api<ApiWarning>('/warnings', { method: 'POST', body: input }),
    onSuccess: invalidate,
  })

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; status: WarningStatus }) =>
      api<ApiWarning>(`/warnings/${input.id}`, { method: 'PATCH', body: { status: input.status } }),
    onSuccess: invalidate,
  })

  return { create, updateStatus }
}
