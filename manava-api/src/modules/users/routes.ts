import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'

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

const activeSchema = z.object({ is_active: z.boolean() })

// PATCH /api/v1/users/:id — activate / deactivate an account.
// Deactivation revokes every live refresh token so the session dies at the
// next refresh (access tokens expire on their own within 15 minutes).
usersRouter.patch(
  '/:id',
  authenticate,
  requireRole('superadmin', 'hr_admin'),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const { is_active } = req.body as z.infer<typeof activeSchema>
    const target = await prisma.user.findUnique({ where: { user_id: req.params.id } })
    if (!target) return res.status(404).json(fail('Pengguna tidak ditemukan'))

    if (target.user_id === req.user!.sub) {
      return res.status(422).json(fail('Tidak dapat menonaktifkan akun sendiri'))
    }
    // Only a superadmin may touch superadmin accounts.
    if (target.role === 'superadmin' && req.user!.role !== 'superadmin') {
      return res.status(403).json(fail('Hanya superadmin yang dapat mengubah akun superadmin'))
    }

    const updated = await prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { user_id: target.user_id },
        data: { is_active },
        select: {
          user_id: true,
          full_name: true,
          email: true,
          role: true,
          avatar: true,
          is_active: true,
          created_at: true,
        },
      })
      if (!is_active) {
        await tx.refreshToken.updateMany({
          where: { user_id: target.user_id, revoked_at: null },
          data: { revoked_at: new Date() },
        })
      }
      return user
    })
    return res.json(ok(updated))
  }),
)
