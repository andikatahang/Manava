import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'
import { HttpError } from '../../middleware/errorHandler.js'

export const projectsRouter = Router()

// GET /api/v1/projects — read-only in this iteration
projectsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
    })
    res.json(ok(projects, { total: projects.length }))
  }),
)

projectsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { project_id: req.params.id },
      include: {
        envelope: true,
        contracts: true,
        revisions: true,
        escrow: true,
      },
    })
    if (!project) throw new HttpError(404, 'Project not found')
    res.json(ok(project))
  }),
)
