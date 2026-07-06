import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authLimiter } from '../../lib/rateLimit.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'
import { getUserById, login, logout, refresh, register, type AuthResult } from './service.js'

export const authRouter = Router()

// Cookie-free auth: the refresh token travels in the JSON body and the client
// keeps it in localStorage. Tokens are still rotated + hashed server-side.

// identifier = email or username
const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body as z.infer<typeof loginSchema>
    const result = await login(identifier, password)
    res.json(ok(authPayload(result)))
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
    res.status(201).json(ok(authPayload(result)))
  }),
)

authRouter.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const raw = (req.body as { refreshToken?: unknown })?.refreshToken
    if (typeof raw !== 'string' || !raw) throw new HttpError(401, 'Refresh token missing')
    const result = await refresh(raw)
    res.json(ok(authPayload(result)))
  }),
)

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = (req.body as { refreshToken?: unknown })?.refreshToken
    await logout(typeof raw === 'string' && raw ? raw : null)
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

function authPayload(result: AuthResult) {
  return {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    refreshExpiresAt: result.refreshExpiresAt,
  }
}
