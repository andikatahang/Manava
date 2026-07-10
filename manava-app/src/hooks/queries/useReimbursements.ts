// Hooks untuk Klaim Dana Operasional Proyek (reimbursement)
// editor: ajukan + riwayat milik sendiri; admin_manager: klaim editor departemennya

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ReimbursementClaim } from '../../types'

export function useReimbursements() {
  return useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => api<ReimbursementClaim[]>('/reimbursements'),
  })
}

export function useReimbursementMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reimbursements'] })

  const submit = useMutation({
    mutationFn: (data: { amount: number; purpose: string; proof_name: string; proof_data: string }) =>
      api<ReimbursementClaim>('/reimbursements', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })

  const approve = useMutation({
    mutationFn: (claimId: string) =>
      api<ReimbursementClaim>(`/reimbursements/${claimId}/approve`, { method: 'PATCH' }),
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: (claimId: string) =>
      api<ReimbursementClaim>(`/reimbursements/${claimId}/reject`, { method: 'PATCH' }),
    onSuccess: invalidate,
  })

  return { submit, approve, reject }
}
