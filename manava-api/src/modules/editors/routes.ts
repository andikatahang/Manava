import { Router } from 'express'
import { z } from 'zod'
import type { Editor, PerformanceBand } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
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

const ratingSchema = z.object({
  manager_rating: z.number().min(1).max(5),
})

const round1 = (n: number) => Math.round(n * 10) / 10

// KPI = (client rating + completion-rate-as-5-scale + manager rating) / 3 —
// same formula the seed uses; the band follows the combined average.
function bandOf(kpi: number): PerformanceBand {
  return kpi >= 4.5 ? 'excellent' : kpi >= 3.5 ? 'good' : 'needs_improvement'
}

// PATCH /api/v1/editors/:id/metrics — Manager Assessment.
// Admin Managers may only rate editors in departments they manage; HR roles
// may rate anyone. KPI average and band are recomputed server-side.
editorsRouter.patch(
  '/:id/metrics',
  authenticate,
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  validateBody(ratingSchema),
  asyncHandler(async (req, res) => {
    const { manager_rating } = req.body as z.infer<typeof ratingSchema>
    const editor = await prisma.editor.findUnique({
      where: { editor_id: req.params.id },
      include: { metrics: true },
    })
    if (!editor) return res.status(404).json(fail('Editor tidak ditemukan'))

    if (req.user!.role === 'admin_manager') {
      const managed = await prisma.department.findFirst({
        where: {
          manager: { user_id: req.user!.sub },
          members: { some: { editor_id: editor.editor_id } },
        },
        select: { id: true },
      })
      if (!managed) {
        return res.status(403).json(fail('Anda hanya dapat menilai editor di departemen Anda'))
      }
    }

    // Base the recompute on current metrics; fall back to the editor row for
    // editors that never got a metrics row (e.g. fresh recruits).
    const avg_client_rating = editor.metrics?.avg_client_rating ?? editor.rating
    const completion_rate = editor.metrics?.completion_rate ?? editor.completion_rate
    const kpi_average = round1((avg_client_rating + (completion_rate / 100) * 5 + manager_rating) / 3)
    const performance_band = bandOf(kpi_average)

    const [metrics] = await prisma.$transaction([
      prisma.editorMetrics.upsert({
        where: { editor_id: editor.editor_id },
        update: { manager_rating, kpi_average, performance_band },
        create: {
          editor_id: editor.editor_id,
          editor_name: editor.full_name,
          avg_client_rating,
          completion_rate,
          manager_rating,
          kpi_average,
          performance_band,
        },
      }),
      // Keep the denormalized band on the editor row in sync for list views.
      prisma.editor.update({
        where: { editor_id: editor.editor_id },
        data: { performance_band },
      }),
    ])
    return res.json(ok(metrics))
  }),
)
