// Thin fetch wrapper for the Manava API.
// - Base URL from VITE_API_BASE_URL (defaults to localhost:4000).
// - Cookie-free auth: the access token lives in memory, the refresh token in
//   localStorage; both travel in request headers/body, never as cookies.
// - On a 401 the client tries one silent refresh, then retries the request.

import type { User } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000'
const REFRESH_STORAGE_KEY = 'manava_refresh_token'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_STORAGE_KEY, token)
    else localStorage.removeItem(REFRESH_STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode) — session simply won't survive reload.
  }
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

// Fetch a binary endpoint (e.g. CV preview) with the same auth + refresh
// behaviour as api(), returning a Blob instead of a parsed envelope.
export async function apiBlob(path: string): Promise<Blob> {
  const doFetch = () =>
    fetch(`${API_BASE}/api/v1${path}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })

  let res = await doFetch()
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) res = await doFetch()
  }
  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`)
  return res.blob()
}

export interface AuthPayload {
  user: User
  accessToken: string
  refreshToken: string
}

// Exchange the stored refresh token for a fresh access token. Returns null
// when there is no valid session (first visit / logged out / expired refresh).
export async function tryRefresh(): Promise<AuthPayload | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      setRefreshToken(null)
      return null
    }
    const envelope = (await res.json()) as Envelope<AuthPayload>
    if (!envelope.success || !envelope.data) {
      setRefreshToken(null)
      return null
    }
    accessToken = envelope.data.accessToken
    setRefreshToken(envelope.data.refreshToken)
    return envelope.data
  } catch {
    return null
  }
}

// Sends the stored refresh token so the server can revoke it, then clears it.
export async function revokeSession(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    await api('/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {},
      skipRefresh: true,
    })
  } finally {
    setRefreshToken(null)
  }
}
