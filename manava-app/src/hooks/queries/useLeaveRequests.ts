import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveLeaveRequest,
  fetchLeaveRequests,
  rejectLeaveRequest,
  submitLeaveRequest,
  type DecisionInput,
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
    mutationFn: (args: { id: string; input?: DecisionInput }) => approveLeaveRequest(args.id, args.input),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (args: { id: string; input?: DecisionInput }) => rejectLeaveRequest(args.id, args.input),
    onSuccess: invalidate,
  })

  return { submit, approve, reject }
}
