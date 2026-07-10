import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'

export const leaveRequestsRouter = Router()

// Requester identity comes from the JWT — the client only sends the leave
// details, so nobody can file leave under someone else's name.
const createSchema = z
  .object({
    leave_type: z.enum(['cuti', 'izin']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
    reason: z.string().max(500, 'Alasan tidak boleh melebihi 500 karakter').optional(),
  })
  .refine(d => d.start_date <= d.end_date, {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['end_date'],
  })

const decisionSchema = z.object({
  decision_note: z.string().max(500, 'Catatan keputusan tidak boleh melebihi 500 karakter').optional(),
})

// Approval routing per CLAUDE.md — requests travel one level up:
//   editor request → admin_manager approves
//   admin_manager request → hr_admin approves
const CAN_APPROVE: Record<string, string[]> = {
  admin_manager: ['editor'],
  hr_admin: ['admin_manager'],
  superadmin: ['editor', 'admin_manager'],
}

// Only these roles file leave through this endpoint; the role also fixes
// which requester_role the request is recorded under.
const FILES_AS: Record<string, 'editor' | 'admin_manager'> = {
  editor: 'editor',
  admin_manager: 'admin_manager',
}

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

// Scoping per level MIS:
//   editor        → hanya pengajuan miliknya sendiri (data operasional pribadi)
//   admin_manager → pengajuan editor di departemennya + pengajuan miliknya
//   hr_admin/superadmin → semua (rekap strategis)
leaveRequestsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    let where: Record<string, unknown> = {}

    if (viewer.role === 'editor') {
      where = { requester_id: viewer.sub }
    } else if (viewer.role === 'admin_manager') {
      const teamIds = await managedEditorUserIds(viewer.sub)
      where = { requester_id: { in: [...teamIds, viewer.sub] } }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })
    res.json(ok(leaves, { total: leaves.length }))
  }),
)

leaveRequestsRouter.post(
  '/',
  authenticate,
  requireRole('editor', 'admin_manager'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const requester = await prisma.user.findUnique({ where: { user_id: req.user!.sub } })
    if (!requester) return res.status(404).json(fail('User tidak ditemukan'))

    const created = await prisma.leaveRequest.create({
      data: {
        requester_id: requester.user_id,
        requester_name: requester.full_name,
        requester_role: FILES_AS[requester.role]!,
        leave_type: body.leave_type,
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
        reason: body.reason || null,
      },
    })
    return res.status(201).json(ok(created))
  }),
)

leaveRequestsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  validateBody(decisionSchema),
  asyncHandler((req, res, next) => transition(req, res, next, 'approved')),
)

leaveRequestsRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  validateBody(decisionSchema),
  asyncHandler((req, res, next) => transition(req, res, next, 'rejected')),
)

async function transition(
  req: import('express').Request,
  res: import('express').Response,
  _next: import('express').NextFunction,
  status: 'approved' | 'rejected',
) {
  const body = req.body as z.infer<typeof decisionSchema> | undefined
  const leave = await prisma.leaveRequest.findUnique({ where: { leave_id: req.params.id } })
  if (!leave) return res.status(404).json(fail('Not found'))
  const canApprove = CAN_APPROVE[req.user!.role] ?? []
  if (!canApprove.includes(leave.requester_role)) {
    return res.status(403).json(fail('Not allowed to action this request'))
  }
  // Admin manager hanya boleh memutuskan pengajuan editor di departemennya sendiri.
  if (req.user!.role === 'admin_manager') {
    const teamIds = await managedEditorUserIds(req.user!.sub)
    if (!teamIds.includes(leave.requester_id)) {
      return res.status(403).json(fail('Pengajuan ini bukan dari staf di departemen Anda'))
    }
  }
  if (leave.status !== 'pending') {
    return res.status(409).json(fail('Permohonan sudah diputuskan'))
  }
  const decider = await prisma.user.findUnique({ where: { user_id: req.user!.sub } })
  const updated = await prisma.leaveRequest.update({
    where: { leave_id: req.params.id },
    data: {
      status,
      decided_by_id: req.user!.sub,
      decided_by_name: decider?.full_name || null,
      decided_at: new Date(),
      decision_note: body?.decision_note || null,
    },
  })
  return res.json(ok(updated))
}
