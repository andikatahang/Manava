import jwt, { type SignOptions } from 'jsonwebtoken'
import * as crypto from 'node:crypto'
import { env } from '../config/env.js'
import type { UserRole } from '@prisma/client'

export interface AccessTokenPayload {
  sub: string       // user_id
  role: UserRole
  email: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
  if (typeof decoded === 'string') throw new Error('Invalid token payload')
  return decoded as AccessTokenPayload
}

// Refresh tokens are opaque random strings — we store a SHA-256 hash in the DB
// so a leaked DB does not leak usable tokens. Rotated on every /auth/refresh.
export function generateRefreshToken(): { raw: string; hash: string; expires_at: Date } {
  const raw = crypto.randomBytes(48).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const expires_at = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { raw, hash, expires_at }
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
