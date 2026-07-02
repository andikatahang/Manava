import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'

export const leaveRequestsRouter = Router()

const createSchema = z.object({
  editor_id: z.string(),
  editor_name: z.string(),
  requester_role: z.enum(['editor', 'admin_manager']),
  leave_type: z.enum(['cuti', 'izin']),
  start_date: z.string(),
  end_date: z.string(),
})

// Approval routing per CLAUDE.md:
//   editor request → admin_manager approves
//   admin_manager request → hr_admin approves
const CAN_APPROVE: Record<string, string[]> = {
  admin_manager: ['editor'],
  hr_admin: ['admin_manager'],
  superadmin: ['editor', 'admin_manager'],
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
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const created = await prisma.leaveRequest.create({
      data: {
        editor_id: body.editor_id,
        editor_name: body.editor_name,
        requester_role: body.requester_role,
        leave_type: body.leave_type,
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
      },
    })
    res.status(201).json(ok(created))
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
  if (!leave) return res.status(404).json({ success: false, data: null, error: 'Not found' })
  const canApprove = CAN_APPROVE[req.user!.role] ?? []
  if (!canApprove.includes(leave.requester_role)) {
    return res.status(403).json({ success: false, data: null, error: 'Not allowed to action this request' })
  }
  const updated = await prisma.leaveRequest.update({
    where: { leave_id: req.params.id },
    data: { status },
  })
  return res.json(ok(updated))
}
