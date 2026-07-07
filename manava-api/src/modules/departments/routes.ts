import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'

export const departmentsRouter = Router()

const createSchema = z.object({
  name: z.string().min(1).max(80),
  manager_id: z.string().min(1),
})

const updateSchema = createSchema.partial()

const memberSchema = z.object({
  editor_ids: z.array(z.string()).min(1),
})

const HR_ROLES = ['hr_admin', 'superadmin'] as const

// GET /api/v1/departments — includes manager + members for the dashboard grid
departmentsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({
      include: {
        manager: true,
        members: { include: { editor: { include: { metrics: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(ok(departments, { total: departments.length }))
  }),
)

// GET /api/v1/departments/managers — Admin Manager directory for the picker
departmentsRouter.get(
  '/managers',
  authenticate,
  asyncHandler(async (_req, res) => {
    const managers = await prisma.adminManager.findMany({ orderBy: { full_name: 'asc' } })
    res.json(ok(managers, { total: managers.length }))
  }),
)

// One manager may lead at most one department. `excludeId` skips the
// department being edited so re-saving with the same manager still works.
async function assertManagerAvailable(managerId: string, excludeId?: string): Promise<void> {
  const existing = await prisma.department.findFirst({
    where: { manager_id: managerId, ...(excludeId ? { id: { not: excludeId } } : {}) },
  })
  if (existing) {
    throw new HttpError(
      409,
      `Manajer ini sudah memimpin departemen "${existing.name}" — satu manajer hanya boleh memimpin satu departemen`,
    )
  }
}

// POST /api/v1/departments — create with name + manager only; members added later
departmentsRouter.post(
  '/',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const { name, manager_id } = req.body as z.infer<typeof createSchema>
    const manager = await prisma.adminManager.findUnique({ where: { id: manager_id } })
    if (!manager) throw new HttpError(400, 'Manager not found')
    await assertManagerAvailable(manager_id)
    const created = await prisma.department.create({
      data: { name, manager_id },
      include: { manager: true, members: true },
    })
    res.status(201).json(ok(created))
  }),
)

// PATCH /api/v1/departments/:id — edit name / manager
departmentsRouter.patch(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>
    if (body.manager_id) await assertManagerAvailable(body.manager_id, req.params.id)
    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: body,
      include: { manager: true, members: { include: { editor: true } } },
    })
    res.json(ok(updated))
  }),
)

// DELETE /api/v1/departments/:id
departmentsRouter.delete(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.department.delete({ where: { id: req.params.id } })
    res.json(ok({ deleted: req.params.id }))
  }),
)

// POST /api/v1/departments/:id/members — add editors (idempotent skipDuplicates)
departmentsRouter.post(
  '/:id/members',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(memberSchema),
  asyncHandler(async (req, res) => {
    const { editor_ids } = req.body as z.infer<typeof memberSchema>
    // One editor may belong to at most one department — reject any editor who
    // is already a member somewhere else (adding to the same dept is a no-op).
    const taken = await prisma.departmentMember.findMany({
      where: { editor_id: { in: editor_ids }, department_id: { not: req.params.id } },
      include: {
        editor: { select: { full_name: true } },
        department: { select: { name: true } },
      },
    })
    if (taken.length > 0) {
      const detail = taken
        .map(t => `${t.editor.full_name} (${t.department.name})`)
        .join(', ')
      throw new HttpError(
        409,
        `Editor sudah terdaftar di departemen lain: ${detail} — satu editor hanya boleh berada di satu departemen`,
      )
    }
    await prisma.departmentMember.createMany({
      data: editor_ids.map(editor_id => ({ department_id: req.params.id, editor_id })),
      skipDuplicates: true,
    })
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { editor: true } } },
    })
    res.json(ok(dept))
  }),
)

// DELETE /api/v1/departments/:id/members/:editorId
departmentsRouter.delete(
  '/:id/members/:editorId',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.departmentMember.delete({
      where: {
        department_id_editor_id: {
          department_id: req.params.id,
          editor_id: req.params.editorId,
        },
      },
    })
    res.json(ok({ removed: req.params.editorId }))
  }),
)
