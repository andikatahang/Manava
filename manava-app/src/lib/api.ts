// Thin fetch wrapper for the Manava API.
// - Base URL from VITE_API_BASE_URL (defaults to localhost:4000).
// - Access token lives in memory only; the refresh token is an httpOnly
//   cookie scoped to /api/v1/auth, sent via credentials: 'include'.
// - On a 401 the client tries one silent refresh, then retries the request.

import type { User } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export interface Envelope<T> {
  success: boolean
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  skipRefresh?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE}/api/v1${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

  let res = await doFetch()

  // One silent refresh + retry on expired access token.
  if (res.status === 401 && !options.skipRefresh && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh()
    if (refreshed) res = await doFetch()
  }

  const envelope = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!res.ok || !envelope?.success) {
    throw new ApiError(res.status, envelope?.error ?? `Request failed (${res.status})`)
  }
  return envelope.data as T
}

export interface AuthPayload {
  user: User
  accessToken: string
}

// Exchange the refresh cookie for a fresh access token. Returns null when
// there is no valid session (first visit / logged out / expired refresh).
export async function tryRefresh(): Promise<AuthPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const envelope = (await res.json()) as Envelope<AuthPayload>
    if (!envelope.success || !envelope.data) return null
    accessToken = envelope.data.accessToken
    return envelope.data
  } catch {
    return null
  }
}
