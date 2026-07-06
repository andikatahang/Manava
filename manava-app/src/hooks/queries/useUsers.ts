import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { UserRole } from '../../types'

export interface ApiUser {
  user_id: string
  full_name: string
  email: string
  role: UserRole
  avatar: string | null
  is_active: boolean
  created_at: string
}

// GET /users is restricted to superadmin + hr_admin on the API side, so
// callers must gate with `enabled` based on the current role.
export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<ApiUser[]>('/users'),
    enabled,
  })
}

// Activate / deactivate an account. Deactivation also revokes the target's
// refresh tokens server-side, so their session ends at the next refresh.
export function useUserMutations() {
  const qc = useQueryClient()
  const setActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api<ApiUser>(`/users/${userId}`, { method: 'PATCH', body: { is_active: isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
  return { setActive }
}
