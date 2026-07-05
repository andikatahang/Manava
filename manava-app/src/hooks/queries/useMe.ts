import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { User } from '../../types'

// Identity of the signed-in account, straight from the JWT session
// (GET /auth/me). Cached per session; the auth hook clears the query cache
// on login/logout so this never leaks across accounts.
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api<{ user: User }>('/auth/me')).user,
    staleTime: Infinity,
  })
}
