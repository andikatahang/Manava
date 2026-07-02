// Consistent response envelope: { success, data, error, meta }.
// Matches the CLAUDE.md API design spec.

export interface Envelope<T> {
  success: boolean
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

export function ok<T>(data: T, meta?: Record<string, unknown>): Envelope<T> {
  return { success: true, data, error: null, ...(meta ? { meta } : {}) }
}

export function fail(message: string): Envelope<null> {
  return { success: false, data: null, error: message }
}
