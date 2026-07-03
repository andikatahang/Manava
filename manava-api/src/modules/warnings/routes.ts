import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'

export const warningsRouter = Router()

// Target identity is a User id — name and role are derived server-side so a
// warning is always attributable to a real account (and visible to it).
const createSchema = z.object({
  target_user_id: z.string().min(1),
  reason: z.string().min(1),
  severity: z.enum(['ringan', 'sedang', 'berat']),
})

const statusSchema = z.object({
  status: z.enum(['aktif', 'diakui', 'kedaluwarsa']),
})

const SEVERITY_MONTHS = { ringan: 2, sedang: 3, berat: 6 }
const HR_ROLES: readonly string[] = ['hr_admin', 'superadmin']
const TARGETABLE_ROLES = ['editor', 'admin_manager'] as const

// HR sees every warning; editors and admin managers only see warnings
// addressed to their own account.
warningsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const isHR = HR_ROLES.includes(req.user!.role)
    const warnings = await prisma.warning.findMany({
      where: isHR ? undefined : { target_user_id: req.user!.sub },
      include: { issuer: { select: { full_name: true } } },
      orderBy: { issued_at: 'desc' },
    })
    res.json(ok(warnings, { total: warnings.length }))
  }),
)

warningsRouter.post(
  '/',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const { target_user_id, reason, severity } = req.body as z.infer<typeof createSchema>
    const target = await prisma.user.findUnique({ where: { user_id: target_user_id } })
    if (!target) return res.status(404).json(fail('Pengguna target tidak ditemukan'))
    if (!TARGETABLE_ROLES.includes(target.role as (typeof TARGETABLE_ROLES)[number])) {
      return res.status(422).json(fail('Peringatan hanya dapat diterbitkan untuk editor atau admin manager'))
    }

    const issued_at = new Date()
    const expires_at = new Date(issued_at)
    expires_at.setMonth(expires_at.getMonth() + SEVERITY_MONTHS[severity])
    const created = await prisma.warning.create({
      data: {
        target_user_id: target.user_id,
        target_name: target.full_name,
        target_role: target.role as (typeof TARGETABLE_ROLES)[number],
        reason,
        severity,
        issued_at,
        expires_at,
        issued_by_id: req.user!.sub,
      },
    })
    return res.status(201).json(ok(created))
  }),
)

// HR can set any status; the target may acknowledge ('diakui') their own
// active warning — nothing else.
warningsRouter.patch(
  '/:id',
  authenticate,
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as z.infer<typeof statusSchema>
    const warning = await prisma.warning.findUnique({ where: { id: req.params.id } })
    if (!warning) return res.status(404).json(fail('Peringatan tidak ditemukan'))

    const isHR = HR_ROLES.includes(req.user!.role)
    const isOwnAcknowledge =
      warning.target_user_id === req.user!.sub && status === 'diakui' && warning.status === 'aktif'
    if (!isHR && !isOwnAcknowledge) {
      return res.status(403).json(fail('Tidak diizinkan mengubah status peringatan ini'))
    }

    const updated = await prisma.warning.update({
      where: { id: req.params.id },
      data: { status },
    })
    return res.json(ok(updated))
  }),
)
