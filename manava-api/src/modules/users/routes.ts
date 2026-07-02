import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'

export const usersRouter = Router()

// GET /api/v1/users — list all users (superadmin + hr_admin)
usersRouter.get(
  '/',
  authenticate,
  requireRole('superadmin', 'hr_admin'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        user_id: true,
        full_name: true,
        email: true,
        role: true,
        avatar: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })
    res.json(ok(users, { total: users.length }))
  }),
)
