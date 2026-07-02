import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Editor } from '../../types'

export function useEditors() {
  return useQuery({
    queryKey: ['editors'],
    queryFn: () => api<Editor[]>('/editors'),
  })
}
