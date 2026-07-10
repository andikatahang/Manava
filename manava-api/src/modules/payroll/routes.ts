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

// ── 5. Payroll Settings ──────────────────────────────────────────────────────
payrollRouter.get(
  '/settings',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (_req, res) => {
    const settings = await prisma.payrollSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    })
    res.json(ok(settings))
  }),
)

const settingsUpdateSchema = z.object({
  bpjs_kesehatan_rate: z.number().min(0).max(1).optional(),
  bpjs_tk_jkk_rate: z.number().min(0).max(1).optional(),
  bpjs_tk_jkm_rate: z.number().min(0).max(1).optional(),
  bpjs_tk_jht_rate: z.number().min(0).max(1).optional(),
  bpjs_tk_jp_rate: z.number().min(0).max(1).optional(),
  pph21_bracket_1_limit: z.number().int().min(0).optional(),
  pph21_bracket_1_rate: z.number().min(0).max(1).optional(),
  pph21_bracket_2_limit: z.number().int().min(0).optional(),
  pph21_bracket_2_rate: z.number().min(0).max(1).optional(),
  pph21_bracket_3_rate: z.number().min(0).max(1).optional(),
  presensi_penalty_per_day: z.number().int().min(0).optional(),
})

payrollRouter.patch(
  '/settings',
  authenticate,
  requireRole('superadmin', 'hr_admin'),
  validateBody(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    const settings = await prisma.payrollSettings.update({
      where: { id: 'default' },
      data: req.body,
    })
    res.json(ok(settings))
  }),
)

// ── 6. Payment Batch ─────────────────────────────────────────────────────────
payrollRouter.post(
  '/batch/create',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(z.object({ period: z.string().regex(PERIOD_RE) })),
  asyncHandler(async (req, res) => {
    const { period } = req.body

    // Get all finalized payslips for the period
    const [year, month] = period.split('-').map(Number)
    const period_start = new Date(Date.UTC(year, month - 1, 1))

    const payslips = await prisma.payslip.findMany({
      where: {
        period_start,
        status: 'finalized',
        payment_status: 'pending',
      },
      include: { editor: { select: { bank_account_no: true, bank_name: true } } },
    })

    if (payslips.length === 0) {
      return res.status(400).json(fail('Tidak ada slip gaji yang siap dibayar'))
    }

    // Check bank accounts
    const missingBank = payslips.filter(p => !p.editor.bank_account_no)
    if (missingBank.length > 0) {
      return res.status(400).json(fail(
        `${missingBank.length} editor belum melengkapi data rekening bank`
      ))
    }

    const total_amount = payslips.reduce((sum, p) => sum + p.net_salary, 0)

    const batch = await prisma.paymentBatch.create({
      data: {
        period,
        total_amount,
        payslip_count: payslips.length,
        created_by: req.user!.sub,
      },
    })

    // Link payslips to batch
    await prisma.payslip.updateMany({
      where: { payslip_id: { in: payslips.map(p => p.payslip_id) } },
      data: { payment_batch_id: batch.batch_id, payment_status: 'processing' },
    })

    return res.status(201).json(ok(batch))
  }),
)

payrollRouter.post(
  '/batch/:id/process',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const batch = await prisma.paymentBatch.findUnique({
      where: { batch_id: req.params.id },
      include: { payslips: true },
    })
    if (!batch) return res.status(404).json(fail('Batch tidak ditemukan'))
    if (batch.status !== 'pending') {
      return res.status(409).json(fail('Batch sudah diproses'))
    }

    // Simulate payment processing (in real system, this would call bank API)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const now = new Date()
    await prisma.$transaction([
      prisma.paymentBatch.update({
        where: { batch_id: batch.batch_id },
        data: { status: 'completed', processed_at: now },
      }),
      prisma.payslip.updateMany({
        where: { payment_batch_id: batch.batch_id },
        data: {
          payment_status: 'completed',
          paid_at: now,
          status: 'paid',
          payment_reference: `BATCH-${batch.batch_id.slice(0, 8).toUpperCase()}`,
        },
      }),
    ])

    return res.json(ok({ batch_id: batch.batch_id, status: 'completed' }))
  }),
)

payrollRouter.get(
  '/batch',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (_req, res) => {
    const batches = await prisma.paymentBatch.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    res.json(ok(batches, { total: batches.length }))
  }),
)

payrollRouter.get(
  '/batch/:id/export',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const batch = await prisma.paymentBatch.findUnique({
      where: { batch_id: req.params.id },
      include: {
        payslips: {
          include: {
            editor: {
              select: {
                bank_name: true,
                bank_account_no: true,
                bank_account_name: true,
              },
            },
          },
        },
      },
    })
    if (!batch) return res.status(404).json(fail('Batch tidak ditemukan'))

    // Generate CSV
    const header = 'No,Nama,Rekening,Bank,Jumlah,Referensi\n'
    const rows = batch.payslips.map((p, i) =>
      `${i + 1},"${p.editor_name}","${p.editor.bank_account_no}","${p.editor.bank_name}",${p.net_salary},"${p.payment_reference ?? '-'}"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${batch.period}.csv"`)
    return res.send(header + rows)
  }),
)

// ── 7. Tax Report ────────────────────────────────────────────────────────────
payrollRouter.get(
  '/reports/tax',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const { period } = req.query as { period?: string }
    if (!period || !PERIOD_RE.test(period)) {
      return res.status(400).json(fail('Parameter period (YYYY-MM) wajib'))
    }

    const [year, month] = period.split('-').map(Number)
    const period_start = new Date(Date.UTC(year!, month! - 1, 1))

    const payslips = await prisma.payslip.findMany({
      where: { period_start, status: { not: 'voided' } },
      select: {
        editor_id: true,
        editor_name: true,
        gross_salary: true,
        pph21_tax: true,
        bpjs_kesehatan: true,
        bpjs_tk_jkk: true,
        bpjs_tk_jkm: true,
        bpjs_tk_jht: true,
        bpjs_tk_jp: true,
        net_salary: true,
      },
      orderBy: { editor_name: 'asc' },
    })

    const totals = {
      total_gross: payslips.reduce((s, p) => s + p.gross_salary, 0),
      total_pph21: payslips.reduce((s, p) => s + p.pph21_tax, 0),
      total_bpjs_kesehatan: payslips.reduce((s, p) => s + p.bpjs_kesehatan, 0),
      total_bpjs_tk: payslips.reduce((s, p) => s + p.bpjs_tk_jkk + p.bpjs_tk_jkm + p.bpjs_tk_jht + p.bpjs_tk_jp, 0),
      total_net: payslips.reduce((s, p) => s + p.net_salary, 0),
      employee_count: payslips.length,
    }

    return res.json(ok({ period, payslips, totals }))
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

    // Recalculate gross and net with tax/BPJS
    const settings = await prisma.payrollSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    })

    const gross_salary = slip.base_salary + slip.overtime_pay + project_bonus + reimbursement_total
    const taxCalc = (await import('./taxCalculator.js')).calculateTax(gross_salary, settings)
    const total_deductions =
      slip.attendance_deduction +
      slip.presensi_penalty +
      taxCalc.pph21_tax +
      taxCalc.bpjs_kesehatan +
      taxCalc.bpjs_tk_jkk +
      taxCalc.bpjs_tk_jkm +
      taxCalc.bpjs_tk_jht +
      taxCalc.bpjs_tk_jp
    const net_salary = gross_salary - total_deductions

    const updated = await prisma.payslip.update({
      where: { payslip_id: slip.payslip_id },
      data: {
        project_bonus,
        reimbursement_total,
        gross_salary,
        total_deductions,
        net_salary,
        pph21_tax: taxCalc.pph21_tax,
        bpjs_kesehatan: taxCalc.bpjs_kesehatan,
        bpjs_tk_jkk: taxCalc.bpjs_tk_jkk,
        bpjs_tk_jkm: taxCalc.bpjs_tk_jkm,
        bpjs_tk_jht: taxCalc.bpjs_tk_jht,
        bpjs_tk_jp: taxCalc.bpjs_tk_jp,
      },
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
