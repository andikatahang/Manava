import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustPayslip,
  fetchMyPayslips,
  fetchPayslip,
  fetchPayslips,
  finalizePayslip,
  generatePayslips,
  payPayslip,
  voidPayslip,
  createPaymentBatch,
  processPaymentBatch,
  fetchPaymentBatches,
  fetchPayrollSettings,
  updatePayrollSettings,
  type PayslipListParams,
  type PayrollSettings,
} from '../../lib/payroll'

const KEY = ['payroll']

export function usePayslips(params: PayslipListParams = {}) {
  return useQuery({ queryKey: [...KEY, params], queryFn: () => fetchPayslips(params) })
}

export function useMyPayslips() {
  return useQuery({ queryKey: [...KEY, 'mine'], queryFn: fetchMyPayslips })
}

export function usePayslip(id: string | undefined) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => fetchPayslip(id!), enabled: !!id })
}

export function usePayrollMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const generate = useMutation({
    mutationFn: ({ period, editor_id }: { period: string; editor_id?: string }) => generatePayslips(period, editor_id),
    onSuccess: invalidate,
  })
  const adjust = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { project_bonus?: number; reimbursement_total?: number } }) =>
      adjustPayslip(id, body),
    onSuccess: invalidate,
  })
  const finalize = useMutation({ mutationFn: finalizePayslip, onSuccess: invalidate })
  const pay = useMutation({ mutationFn: payPayslip, onSuccess: invalidate })
  const voidSlip = useMutation({ mutationFn: voidPayslip, onSuccess: invalidate })

  return { generate, adjust, finalize, pay, voidSlip }
}

export function usePaymentBatches() {
  return useQuery({ queryKey: [...KEY, 'batches'], queryFn: fetchPaymentBatches })
}

export function useBatchMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({ mutationFn: createPaymentBatch, onSuccess: invalidate })
  const process = useMutation({ mutationFn: processPaymentBatch, onSuccess: invalidate })

  return { create, process }
}

export function usePayrollSettings() {
  return useQuery({ queryKey: [...KEY, 'settings'], queryFn: fetchPayrollSettings })
}

export function usePayrollSettingsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PayrollSettings>) => updatePayrollSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
