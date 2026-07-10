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

// Bukti nota/kwitansi wajib: gambar (JPEG/PNG/WebP) sebagai data URL.
// ~5MB file → ~6.8M karakter base64; batas sedikit di atasnya (pola cv_data).
const MAX_PROOF_DATA_LENGTH = 7_500_000
const PROOF_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/

const createSchema = z.object({
  amount: z.number().int().positive('Nominal harus lebih dari 0'),
  purpose: z.string().min(5, 'Jelaskan keperluan klaim (min. 5 karakter)').max(500),
  proof_name: z.string().min(1).max(200),
  proof_data: z
    .string()
    .max(MAX_PROOF_DATA_LENGTH, 'Ukuran bukti maksimal 5MB')
    .regex(PROOF_DATA_URL_RE, 'Bukti wajib berupa gambar JPG/PNG/WebP'),
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
      omit: { proof_data: true }, // payload berat — diambil via GET /:id/proof
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
      has_proof: !!c.proof_name,
      proof_name: c.proof_name,
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
        proof_name: body.proof_name,
        proof_mime: body.proof_data.slice(5, body.proof_data.indexOf(';')),
        proof_data: body.proof_data,
      },
      omit: { proof_data: true },
    })
    return res.status(201).json(ok(created))
  }),
)

// Stream bukti nota sebagai gambar. Akses: pemilik klaim, admin manager
// departemennya, atau HR admin/superadmin — scoping sama dengan GET /.
reimbursementsRouter.get(
  '/:id/proof',
  authenticate,
  asyncHandler(async (req, res) => {
    const claim = await prisma.reimbursementClaim.findUnique({
      where: { claim_id: req.params.id },
      select: { user_id: true, proof_name: true, proof_mime: true, proof_data: true },
    })
    if (!claim) return res.status(404).json(fail('Klaim tidak ditemukan'))

    const viewer = req.user!
    if (viewer.role === 'editor' && claim.user_id !== viewer.sub) {
      return res.status(403).json(fail('Anda tidak berhak melihat bukti klaim ini'))
    }
    if (viewer.role === 'admin_manager') {
      const teamIds = await managedEditorUserIds(viewer.sub)
      if (!teamIds.includes(claim.user_id)) {
        return res.status(403).json(fail('Klaim ini bukan dari staf di departemen Anda'))
      }
    }
    if (!claim.proof_data) return res.status(404).json(fail('Klaim ini belum memiliki bukti'))

    const base64 = claim.proof_data.slice(claim.proof_data.indexOf(',') + 1)
    const buffer = Buffer.from(base64, 'base64')
    res.setHeader('Content-Type', claim.proof_mime ?? 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(claim.proof_name ?? 'bukti')}"`)
    return res.send(buffer)
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
      return res.status(403).json(fail('Klaim ini bukan dari staf di departemen Anda'))
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
