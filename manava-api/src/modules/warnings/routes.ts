import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'

export const warningsRouter = Router()

const createSchema = z.object({
  target_name: z.string().min(1),
  target_role: z.enum(['editor', 'admin_manager']),
  reason: z.string().min(1),
  severity: z.enum(['ringan', 'sedang', 'berat']),
})

const statusSchema = z.object({
  status: z.enum(['aktif', 'diakui', 'kedaluwarsa']),
})

const SEVERITY_MONTHS = { ringan: 2, sedang: 3, berat: 6 }
const HR_ROLES = ['hr_admin', 'superadmin'] as const

warningsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const warnings = await prisma.warning.findMany({
      include: { issuer: { select: { full_name: true } } },
      orderBy: { issued_at: 'desc' },
    })
    res.json(ok(warnings, { total: warnings.length }))
  }),
)

warningsRouter.post(
  '/',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const { target_name, target_role, reason, severity } = req.body as z.infer<typeof createSchema>
    const issued_at = new Date()
    const expires_at = new Date(issued_at)
    expires_at.setMonth(expires_at.getMonth() + SEVERITY_MONTHS[severity])
    const created = await prisma.warning.create({
      data: {
        target_name,
        target_role,
        reason,
        severity,
        issued_at,
        expires_at,
        issued_by_id: req.user!.sub,
      },
    })
    res.status(201).json(ok(created))
  }),
)

warningsRouter.patch(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as z.infer<typeof statusSchema>
    const updated = await prisma.warning.update({
      where: { id: req.params.id },
      data: { status },
    })
    res.json(ok(updated))
  }),
)
