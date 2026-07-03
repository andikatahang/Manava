import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveLeaveRequest,
  fetchLeaveRequests,
  rejectLeaveRequest,
  submitLeaveRequest,
  type SubmitLeaveInput,
} from '../../lib/leaveRequests'

export const LEAVE_REQUESTS_KEY = ['leave-requests']

export function useLeaveRequests(enabled = true) {
  return useQuery({ queryKey: LEAVE_REQUESTS_KEY, queryFn: fetchLeaveRequests, enabled })
}

// Submit (editor / admin manager) and approve / reject (one level up).
// All invalidate the shared list so queues and badges refresh together.
export function useLeaveRequestMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY })

  const submit = useMutation({
    mutationFn: (input: SubmitLeaveInput) => submitLeaveRequest(input),
    onSuccess: invalidate,
  })
  const approve = useMutation({
    mutationFn: (id: string) => approveLeaveRequest(id),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (id: string) => rejectLeaveRequest(id),
    onSuccess: invalidate,
  })

  return { submit, approve, reject }
}
