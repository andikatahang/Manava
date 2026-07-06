import { Router } from 'express'
import type { Editor } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'

export const editorsRouter = Router()

const HR_ROLES: readonly string[] = ['hr_admin', 'superadmin']

// Salary is confidential: only HR roles see every base_salary; everyone else
// sees it on their own record only. Redaction happens here so no other list
// consumer can leak it.
function redactSalary<T extends Editor>(editor: T, viewerRole: string, viewerId: string): T {
  if (HR_ROLES.includes(viewerRole) || editor.user_id === viewerId) return editor
  const { base_salary: _base_salary, ...rest } = editor
  return rest as unknown as T
}

// GET /api/v1/editors — active editors first
editorsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const editors = await prisma.editor.findMany({
      include: { metrics: true },
      orderBy: [{ status: 'asc' }, { full_name: 'asc' }],
    })
    const visible = editors.map(e => redactSalary(e, req.user!.role, req.user!.sub))
    res.json(ok(visible, { total: visible.length }))
  }),
)

// GET /api/v1/editors/:id
editorsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const editor = await prisma.editor.findUnique({
      where: { editor_id: req.params.id },
      include: { metrics: true },
    })
    if (!editor) throw new HttpError(404, 'Editor not found')
    res.json(ok(redactSalary(editor, req.user!.role, req.user!.sub)))
  }),
)
