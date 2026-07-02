import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'
import { getUserById, login, logout, refresh, register, type AuthResult } from './service.js'

export const authRouter = Router()

const REFRESH_COOKIE = 'manava_refresh'

// identifier = email or username
const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body as z.infer<typeof loginSchema>
    const result = await login(identifier, password)
    setRefreshCookie(res, result)
    res.json(ok({ user: result.user, accessToken: result.accessToken }))
  }),
)

// Username is handle-like (no "@", no spaces; only "-" and "_" symbols) so it
// can never collide with the email namespace when both are login identifiers.
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  password: z.string().min(8),
})

// Public signup — client accounts only; role is fixed server-side.
authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof registerSchema>
    const result = await register(input)
    setRefreshCookie(res, result)
    res.status(201).json(ok({ user: result.user, accessToken: result.accessToken }))
  }),
)

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE]
    if (!raw) throw new HttpError(401, 'Refresh cookie missing')
    const result = await refresh(raw)
    setRefreshCookie(res, result)
    res.json(ok({ user: result.user, accessToken: result.accessToken }))
  }),
)

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] ?? null
    await logout(raw)
    res.clearCookie(REFRESH_COOKIE, cookieOpts())
    res.json(ok({ success: true }))
  }),
)

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user!.sub)
    res.json(ok({ user }))
  }),
)

// ── helpers ──────────────────────────────────────────────────────────────────

import type { Response } from 'express'

function cookieOpts() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
  }
}

function setRefreshCookie(res: Response, result: AuthResult) {
  res.cookie(REFRESH_COOKIE, result.refreshToken, {
    ...cookieOpts(),
    expires: result.refreshExpiresAt,
  })
}
