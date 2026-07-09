// Klaim Dana Operasional Proyek (reimbursement)
// Level operasional: editor mengajukan klaim (input harian).
// Level taktis: admin manager menyetujui/menolak klaim editor di departemennya.
// Level strategis: HR admin melihat rekap seluruh klaim.

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'

export const reimbursementsRouter = Router()

const createSchema = z.object({
  amount: z.number().int().positive('Nominal harus lebih dari 0'),
  purpose: z.string().min(5, 'Jelaskan keperluan klaim (min. 5 karakter)').max(500),
})

// Daftar user_id editor pada departemen yang dikelola seorang admin manager.
async function managedEditorUserIds(managerUserId: string): Promise<string[]> {
  const manager = await prisma.adminManager.findUnique({
    where: { user_id: managerUserId },
    select: {
      departments: {
        select: { members: { select: { editor: { select: { user_id: true } } } } },
      },
    },
  })
  if (!manager) return []
  return manager.departments.flatMap(d => d.members.map(m => m.editor.user_id))
}

// Scoping per level MIS: editor → miliknya; admin_manager → editor departemennya;
// hr_admin/superadmin → semua.
reimbursementsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    let where: Record<string, unknown> = {}

    if (viewer.role === 'editor') {
      where = { user_id: viewer.sub }
    } else if (viewer.role === 'admin_manager') {
      const teamIds = await managedEditorUserIds(viewer.sub)
      where = { user_id: { in: teamIds } }
    }

    const claims = await prisma.reimbursementClaim.findMany({
      where,
      include: { user: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    })

    const formatted = claims.map(c => ({
      claim_id: c.claim_id,
      user_id: c.user_id,
      user_name: c.user.full_name,
      amount: c.amount,
      purpose: c.purpose,
      status: c.status,
      decided_at: c.decided_at?.toISOString() ?? null,
      created_at: c.created_at.toISOString(),
    }))
    res.json(ok(formatted, { total: formatted.length }))
  }),
)

// Identitas pengaju dari JWT — tidak bisa mengajukan atas nama orang lain.
reimbursementsRouter.post(
  '/',
  authenticate,
  requireRole('editor'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const created = await prisma.reimbursementClaim.create({
      data: {
        user_id: req.user!.sub,
        amount: body.amount,
        purpose: body.purpose,
      },
    })
    return res.status(201).json(ok(created))
  }),
)

async function decide(
  req: import('express').Request,
  res: import('express').Response,
  status: 'approved' | 'rejected',
) {
  const claim = await prisma.reimbursementClaim.findUnique({ where: { claim_id: req.params.id } })
  if (!claim) return res.status(404).json(fail('Klaim tidak ditemukan'))
  if (claim.status !== 'pending') {
    return res.status(409).json(fail('Klaim sudah diputuskan'))
  }
  // Admin manager hanya memutuskan klaim editor di departemennya sendiri.
  if (req.user!.role === 'admin_manager') {
    const teamIds = await managedEditorUserIds(req.user!.sub)
    if (!teamIds.includes(claim.user_id)) {
      return res.status(403).json(fail('Klaim ini bukan dari editor di departemen Anda'))
    }
  }
  const updated = await prisma.reimbursementClaim.update({
    where: { claim_id: claim.claim_id },
    data: { status, decided_by: req.user!.sub, decided_at: new Date() },
  })
  return res.json(ok(updated))
}

reimbursementsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin_manager', 'superadmin'),
  asyncHandler(async (req, res) => decide(req, res, 'approved')),
)

reimbursementsRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin_manager', 'superadmin'),
  asyncHandler(async (req, res) => decide(req, res, 'rejected')),
)
