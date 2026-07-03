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
  })
  .refine(d => d.start_date <= d.end_date, {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['end_date'],
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

leaveRequestsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const leaves = await prisma.leaveRequest.findMany({
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
      },
    })
    return res.status(201).json(ok(created))
  }),
)

leaveRequestsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  asyncHandler((req, res, next) => transition(req, res, next, 'approved')),
)

leaveRequestsRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  asyncHandler((req, res, next) => transition(req, res, next, 'rejected')),
)

async function transition(
  req: import('express').Request,
  res: import('express').Response,
  _next: import('express').NextFunction,
  status: 'approved' | 'rejected',
) {
  const leave = await prisma.leaveRequest.findUnique({ where: { leave_id: req.params.id } })
  if (!leave) return res.status(404).json(fail('Not found'))
  const canApprove = CAN_APPROVE[req.user!.role] ?? []
  if (!canApprove.includes(leave.requester_role)) {
    return res.status(403).json(fail('Not allowed to action this request'))
  }
  if (leave.status !== 'pending') {
    return res.status(409).json(fail('Permohonan sudah diputuskan'))
  }
  const updated = await prisma.leaveRequest.update({
    where: { leave_id: req.params.id },
    data: { status },
  })
  return res.json(ok(updated))
}
