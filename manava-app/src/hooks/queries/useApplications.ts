import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveApplication,
  fetchApplication,
  fetchApplications,
  rejectApplication,
  shortlistApplication,
  type InterviewDetails,
} from '../../lib/applications'

const KEY = ['applications']

export function useApplications(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: fetchApplications, enabled })
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchApplication(id!),
    enabled: !!id,
  })
}

// Stage transitions for the HR detail page: shortlist (→ interview, sends the
// invitation email), approve (→ approved, creates the editor account) and
// reject. All invalidate both the list and the open detail.
export function useApplicationMutations(id: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const shortlist = useMutation({
    mutationFn: (details: InterviewDetails) => shortlistApplication(id, details),
    onSuccess: invalidate,
  })
  const approve = useMutation({
    mutationFn: (department?: string) => approveApplication(id, department),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: () => rejectApplication(id),
    onSuccess: invalidate,
  })

  return { shortlist, approve, reject }
}
