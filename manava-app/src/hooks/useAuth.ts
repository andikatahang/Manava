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

  const login = async (email: string, password: string): Promise<User> => {
    const payload = await api<AuthPayload>('/auth/login', {
      method: 'POST',
      body: { email, password },
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

  return { user, login, logout, isAuthenticated: user !== null, isHydrating }
}
