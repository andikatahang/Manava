import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createJobPosting,
  deleteJobPosting,
  fetchJobPostings,
  fetchOpenJobPostings,
  updateJobPosting,
  updateJobPostingStatus,
  type JobPostingInput,
} from '../../lib/applications'

const KEY = ['job-postings']
const OPEN_KEY = ['job-postings', 'open']

// HR management list — includes closed postings.
export function useJobPostings(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: fetchJobPostings, enabled })
}

// Public /apply list — open postings only.
export function useOpenJobPostings(enabled = true) {
  return useQuery({ queryKey: OPEN_KEY, queryFn: fetchOpenJobPostings, enabled })
}

export function useJobPostingMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (input: JobPostingInput) => createJobPosting(input),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<JobPostingInput> }) => updateJobPosting(id, input),
    onSuccess: invalidate,
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'closed' }) => updateJobPostingStatus(id, status),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteJobPosting(id),
    onSuccess: invalidate,
  })

  return { create, update, setStatus, remove }
}
