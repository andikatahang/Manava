import { useState } from 'react'
import type { User, UserRole } from '../types'
import { mockUsers } from '../data/mockData'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)

  const login = (role: UserRole) => {
    setUser(mockUsers[role] ?? mockUsers.superadmin)
  }

  const logout = () => setUser(null)

  return { user, login, logout, isAuthenticated: user !== null }
}
