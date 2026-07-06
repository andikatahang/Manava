import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Editor, EditorMetrics } from '../../types'

export function useEditors(enabled = true) {
  return useQuery({
    queryKey: ['editors'],
    queryFn: () => api<Editor[]>('/editors'),
    enabled,
  })
}

// Manager Assessment: PATCH /editors/:id/metrics persists the rating and the
// server recomputes kpi_average + performance_band. AMs are scoped to their
// own department members server-side.
export function useEditorMutations() {
  const qc = useQueryClient()
  const setManagerRating = useMutation({
    mutationFn: ({ editorId, rating }: { editorId: string; rating: number }) =>
      api<EditorMetrics>(`/editors/${editorId}/metrics`, {
        method: 'PATCH',
        body: { manager_rating: rating },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['editors'] }),
  })
  return { setManagerRating }
}
