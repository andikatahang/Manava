import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'

export const editorsRouter = Router()

// GET /api/v1/editors — active editors first
editorsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const editors = await prisma.editor.findMany({
      include: { metrics: true },
      orderBy: [{ status: 'asc' }, { full_name: 'asc' }],
    })
    res.json(ok(editors, { total: editors.length }))
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
    res.json(ok(editor))
  }),
)
