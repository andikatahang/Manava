import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Department, Editor } from '../../types'

export interface DepartmentManager {
  id: string
  user_id: string | null
  full_name: string
  department: string
  avatar: string | null
}

// Server shape: department with manager + members (editor incl. metrics).
interface ApiDepartment {
  id: string
  name: string
  manager_id: string
  manager: DepartmentManager
  members: { editor_id: string; editor: Editor }[]
}

// Department enriched with the joined manager + editor rows so pages never
// need fixture lookups.
export interface DepartmentDetail extends Department {
  manager: DepartmentManager
  editors: Editor[]
}

function toDepartment(d: ApiDepartment): DepartmentDetail {
  return {
    id: d.id,
    name: d.name,
    manager_id: d.manager_id,
    member_ids: d.members.map(m => m.editor_id),
    manager: d.manager,
    editors: d.members.map(m => m.editor),
  }
}

const KEY = ['departments']

// Admin Manager directory for the department form's manager picker.
export function useDepartmentManagers() {
  return useQuery({
    queryKey: ['department-managers'],
    queryFn: () => api<DepartmentManager[]>('/departments/managers'),
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const rows = await api<ApiDepartment[]>('/departments')
      return rows.map(toDepartment)
    },
  })
}

export function useDepartmentMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (input: { name: string; manager_id: string }) =>
      api<ApiDepartment>('/departments', { method: 'POST', body: input }),
    onSuccess: invalidate,
  })

  const updateBasics = useMutation({
    mutationFn: (input: { id: string; name: string; manager_id: string }) =>
      api<ApiDepartment>(`/departments/${input.id}`, {
        method: 'PATCH',
        body: { name: input.name, manager_id: input.manager_id },
      }),
    onSuccess: invalidate,
  })

  const addMembers = useMutation({
    mutationFn: (input: { id: string; editor_ids: string[] }) =>
      api(`/departments/${input.id}/members`, { method: 'POST', body: { editor_ids: input.editor_ids } }),
    onSuccess: invalidate,
  })

  const removeMember = useMutation({
    mutationFn: (input: { id: string; editor_id: string }) =>
      api(`/departments/${input.id}/members/${input.editor_id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  return { create, updateBasics, addMembers, removeMember, remove }
}
