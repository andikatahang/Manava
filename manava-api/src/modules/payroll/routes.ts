import { Router } from 'express'
import { z } from 'zod'
import type { Payslip } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import { generatePayslipForEditor } from './service.js'

export const payrollRouter = Router()

const HR_ROLES = ['hr_admin', 'superadmin'] as const
const PERIOD_RE = /^\d{4}-\d{2}$/

// ── 1. Generate — single editor or bulk (all active editors) for a period ───
const generateSchema = z.object({
  period: z.string().regex(PERIOD_RE, 'Format periode harus YYYY-MM'),
  editor_id: z.string().optional(),
})

payrollRouter.post(
  '/generate',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(generateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof generateSchema>

    if (body.editor_id) {
      const editor = await prisma.editor.findUnique({ where: { editor_id: body.editor_id } })
      if (!editor) return res.status(404).json(fail('Editor tidak ditemukan'))
      const result = await generatePayslipForEditor(editor, body.period)
      return res.status(201).json(ok(result))
    }

    const editors = await prisma.editor.findMany({ where: { status: 'active' } })
    const results = []
    for (const editor of editors) {
      results.push(await generatePayslipForEditor(editor, body.period))
    }
    const generated = results.filter(r => r.regenerated).length
    return res.status(201).json(ok({ total: results.length, generated, skipped: results.length - generated }))
  }),
)

// ── 2. HR list + detail ──────────────────────────────────────────────────────
const listQuerySchema = z.object({
  period: z.string().regex(PERIOD_RE).optional(),
  editor_id: z.string().optional(),
  status: z.enum(['draft', 'finalized', 'paid', 'voided']).optional(),
})

payrollRouter.get(
  '/',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query)
    const where: Record<string, unknown> = {}
    if (query.editor_id) where.editor_id = query.editor_id
    if (query.status) where.status = query.status
    if (query.period) {
      const [year, month] = query.period.split('-').map(Number)
      where.period_start = new Date(Date.UTC(year!, month! - 1, 1))
    }
    const rows = await prisma.payslip.findMany({ where, orderBy: [{ period_start: 'desc' }, { editor_name: 'asc' }] })
    res.json(ok(rows, { total: rows.length }))
  }),
)

// Editor's own payslips — must come before '/:id' so it isn't swallowed by it.
payrollRouter.get(
  '/mine',
  authenticate,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const editor = await prisma.editor.findUnique({ where: { user_id: req.user!.sub } })
    if (!editor) return res.json(ok([], { total: 0 }))
    const rows = await prisma.payslip.findMany({
      where: { editor_id: editor.editor_id, status: { not: 'draft' } },
      orderBy: { period_start: 'desc' },
    })
    return res.json(ok(rows, { total: rows.length }))
  }),
)

payrollRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const slip = await prisma.payslip.findUnique({ where: { payslip_id: req.params.id } })
    if (!slip) return res.status(404).json(fail('Slip gaji tidak ditemukan'))

    if (req.user!.role === 'editor') {
      const editor = await prisma.editor.findUnique({ where: { user_id: req.user!.sub } })
      if (!editor || editor.editor_id !== slip.editor_id || slip.status === 'draft') {
        return res.status(403).json(fail('Tidak berhak mengakses slip gaji ini'))
      }
    } else if (!HR_ROLES.includes(req.user!.role as (typeof HR_ROLES)[number])) {
      return res.status(403).json(fail('Tidak berhak mengakses slip gaji ini'))
    }
    return res.json(ok(slip))
  }),
)

// ── 3. HR adjustments (draft only) — bonus / reimbursement, recomputes net ──
const adjustSchema = z.object({
  project_bonus: z.number().int().min(0).optional(),
  reimbursement_total: z.number().int().min(0).optional(),
})

payrollRouter.patch(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(adjustSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof adjustSchema>
    const slip = await prisma.payslip.findUnique({ where: { payslip_id: req.params.id } })
    if (!slip) return res.status(404).json(fail('Slip gaji tidak ditemukan'))
    if (slip.status !== 'draft') {
      return res.status(409).json(fail('Hanya slip berstatus Draft yang dapat diubah'))
    }

    const project_bonus = body.project_bonus ?? slip.project_bonus
    const reimbursement_total = body.reimbursement_total ?? slip.reimbursement_total
    const net_salary =
      slip.base_salary - slip.attendance_deduction + slip.overtime_pay + project_bonus + reimbursement_total

    const updated = await prisma.payslip.update({
      where: { payslip_id: slip.payslip_id },
      data: { project_bonus, reimbursement_total, net_salary },
    })
    return res.json(ok(updated))
  }),
)

// ── 4. Status transitions: draft → finalized → paid; draft/finalized → voided
async function transition(
  payslipId: string,
  from: string[],
  to: 'finalized' | 'paid' | 'voided',
): Promise<{ error: number; message: string } | { slip: Payslip }> {
  const slip = await prisma.payslip.findUnique({ where: { payslip_id: payslipId } })
  if (!slip) return { error: 404, message: 'Slip gaji tidak ditemukan' }
  if (!from.includes(slip.status)) {
    return { error: 409, message: `Slip berstatus ${slip.status} tidak dapat diubah ke ${to}` }
  }
  const updated = await prisma.payslip.update({ where: { payslip_id: payslipId }, data: { status: to } })
  return { slip: updated }
}

payrollRouter.patch(
  '/:id/finalize',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const result = await transition(req.params.id, ['draft'], 'finalized')
    if ('error' in result) return res.status(result.error).json(fail(result.message))
    return res.json(ok(result.slip))
  }),
)

payrollRouter.patch(
  '/:id/pay',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const result = await transition(req.params.id, ['finalized'], 'paid')
    if ('error' in result) return res.status(result.error).json(fail(result.message))
    return res.json(ok(result.slip))
  }),
)

payrollRouter.patch(
  '/:id/void',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const result = await transition(req.params.id, ['draft', 'finalized'], 'voided')
    if ('error' in result) return res.status(result.error).json(fail(result.message))
    return res.json(ok(result.slip))
  }),
)
