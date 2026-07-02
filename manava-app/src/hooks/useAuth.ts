import { useEffect, useState } from 'react'
import type { User } from '../types'
import { api, setAccessToken, tryRefresh, type AuthPayload } from '../lib/api'

// Real backend auth. The access token lives in memory (lib/api.ts); the
// refresh token is an httpOnly cookie, so a page reload re-hydrates the
// session via POST /auth/refresh.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isHydrating, setIsHydrating] = useState(true)

  useEffect(() => {
    let cancelled = false
    tryRefresh()
      .then(payload => {
        if (!cancelled && payload) setUser(payload.user)
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false)
      })
    return () => { cancelled = true }
  }, [])

  // identifier = email or username
  const login = async (identifier: string, password: string): Promise<User> => {
    const payload = await api<AuthPayload>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      skipRefresh: true,
    })
    setAccessToken(payload.accessToken)
    setUser(payload.user)
    return payload.user
  }

  // Client self-signup; a successful register logs the user straight in.
  const register = async (input: {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
  }): Promise<User> => {
    const payload = await api<AuthPayload>('/auth/register', {
      method: 'POST',
      body: input,
      skipRefresh: true,
    })
    setAccessToken(payload.accessToken)
    setUser(payload.user)
    return payload.user
  }

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipRefresh: true })
    } catch {
      // Session cleanup is best-effort; clear local state regardless.
    }
    setAccessToken(null)
    setUser(null)
  }

  return { user, login, register, logout, isAuthenticated: user !== null, isHydrating }
}
