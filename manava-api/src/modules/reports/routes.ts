// API routes untuk department reporting (alur MIS otomatis)
//
// Alur: sistem meng-agregasi data harian editor secara otomatis menjadi
// "Draft Laporan Bulanan Departemen" (GET /draft). Admin Manager mereview
// lalu meneruskannya ke HR Admin (POST /forward) — bukan meng-input laporan
// secara manual. HR Admin memakai laporan berstatus 'forwarded' untuk review
// kinerja dan finalisasi payroll.

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import {
  computeAttendanceSummary,
  computeKpiSummary,
  computeLeaveSummary,
  computeWarningSummary,
  computeReimbursementSummary,
  computeEditorSnapshot,
} from './aggregator.js'
import type {
  DepartmentReportData, DraftReportData, ReportStatus, EditorReportData, EditorReportStatus,
  AttendanceSummary, KpiSummary, LeaveSummary, WarningSummary, ReimbursementSummary,
  EditorReportKpi, EditorReportAttendance, EditorReportLeave, EditorReportProject,
} from './types.js'

export const reportsRouter = Router()

const PERIOD_REGEX = /^\d{4}-\d{2}$/

const forwardReportSchema = z.object({
  period: z.string().regex(PERIOD_REGEX, 'Period must be YYYY-MM format'),
  manager_notes: z.string().optional(),
})

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number)
  return {
    start: new Date(year!, month! - 1, 1),
    end: new Date(year!, month!, 0, 23, 59, 59),
  }
}

/** Ambil AdminManager + departemen pertama milik user, atau null. */
async function managerDepartment(userId: string) {
  const manager = await prisma.adminManager.findUnique({
    where: { user_id: userId },
    include: { departments: true },
  })
  if (!manager || manager.departments.length === 0) return null
  return { manager, department: manager.departments[0]! }
}

async function computeSummaries(departmentId: string, period: string) {
  const { start, end } = periodBounds(period)
  const [attendance, kpi, leave, warnings, reimbursement] = await Promise.all([
    computeAttendanceSummary(departmentId, start, end),
    computeKpiSummary(departmentId),
    computeLeaveSummary(departmentId, start, end),
    computeWarningSummary(departmentId, start, end),
    computeReimbursementSummary(departmentId, start, end),
  ])
  return { attendance, kpi, leave, warnings, reimbursement }
}

function formatEditorReport(r: {
  report_id: string
  user_id: string
  period: string
  status: string
  kpi_summary: unknown
  attendance_summary: unknown
  leave_summary: unknown
  project_summary: unknown
  editor_notes: string | null
  submitted_at: Date
}, editorName: string, department: string): EditorReportData {
  return {
    report_id: r.report_id,
    user_id: r.user_id,
    editor_name: editorName,
    department,
    period: r.period,
    status: r.status as EditorReportStatus,
    kpi_summary: r.kpi_summary as EditorReportKpi,
    attendance_summary: r.attendance_summary as EditorReportAttendance,
    leave_summary: r.leave_summary as EditorReportLeave,
    project_summary: r.project_summary as EditorReportProject[],
    editor_notes: r.editor_notes,
    submitted_at: r.submitted_at.toISOString(),
  }
}

/** Laporan editor tersubmit untuk sebuah departemen+periode, siap konsolidasi. */
async function departmentEditorReports(departmentId: string, period: string): Promise<EditorReportData[]> {
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    select: { editor: { select: { user_id: true, full_name: true, department: true } } },
  })
  const byUser = new Map(members.map(m => [m.editor.user_id, m.editor]))
  const reports = await prisma.editorReport.findMany({
    where: { user_id: { in: Array.from(byUser.keys()) }, period },
    orderBy: { submitted_at: 'asc' },
  })
  return reports.map(r => {
    const e = byUser.get(r.user_id)!
    return formatEditorReport(r, e.full_name, e.department)
  })
}

/**
 * GET /api/v1/reports/my-draft?period=YYYY-MM
 * Editor: draft laporan bulanan individual (Summary Bulanan Karyawan),
 * di-agregasi otomatis dari data harian miliknya. Jika sudah dikirim,
 * kembalikan snapshot tersimpan.
 */
reportsRouter.get(
  '/my-draft',
  authenticate,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const period = typeof req.query.period === 'string' && PERIOD_REGEX.test(req.query.period)
      ? req.query.period
      : currentPeriod()
    const userId = req.user!.sub

    const existing = await prisma.editorReport.findUnique({
      where: { user_id_period: { user_id: userId, period } },
    })
    if (existing) {
      const editor = await prisma.editor.findUnique({ where: { user_id: userId } })
      return res.json(ok(formatEditorReport(existing, editor?.full_name ?? '', editor?.department ?? '')))
    }

    const { start, end } = periodBounds(period)
    const snap = await computeEditorSnapshot(userId, start, end)
    if (!snap) return res.status(404).json(fail('Data editor tidak ditemukan'))

    const draft: EditorReportData = {
      report_id: null,
      user_id: userId,
      editor_name: snap.editor_name,
      department: snap.department,
      period,
      status: 'draft',
      kpi_summary: snap.kpi,
      attendance_summary: snap.attendance,
      leave_summary: snap.leave,
      project_summary: snap.projects,
      editor_notes: null,
      submitted_at: null,
    }
    return res.json(ok(draft))
  }),
)

/**
 * POST /api/v1/reports/submit
 * Editor mengirim laporan bulanannya ke Admin Manager (snapshot dibekukan).
 */
reportsRouter.post(
  '/submit',
  authenticate,
  requireRole('editor'),
  validateBody(forwardReportSchema.extend({ editor_notes: z.string().optional() }).omit({ manager_notes: true })),
  asyncHandler(async (req, res) => {
    const { period, editor_notes } = req.body as { period: string; editor_notes?: string }
    const userId = req.user!.sub

    const existing = await prisma.editorReport.findUnique({
      where: { user_id_period: { user_id: userId, period } },
    })
    if (existing) {
      return res.status(409).json(fail(`Laporan periode ${period} sudah dikirim ke Admin Manager`))
    }

    const { start, end } = periodBounds(period)
    const snap = await computeEditorSnapshot(userId, start, end)
    if (!snap) return res.status(404).json(fail('Data editor tidak ditemukan'))

    const created = await prisma.editorReport.create({
      data: {
        user_id: userId,
        period,
        status: 'submitted',
        kpi_summary: snap.kpi as object,
        attendance_summary: snap.attendance as object,
        leave_summary: snap.leave as object,
        project_summary: snap.projects as unknown as object,
        editor_notes: editor_notes || null,
      },
    })
    return res.status(201).json(ok(formatEditorReport(created, snap.editor_name, snap.department)))
  }),
)

/**
 * GET /api/v1/reports/editor-reports?period=YYYY-MM
 * Admin Manager: laporan individual yang masuk dari editor departemennya.
 */
reportsRouter.get(
  '/editor-reports',
  authenticate,
  requireRole('admin_manager'),
  asyncHandler(async (req, res) => {
    const period = typeof req.query.period === 'string' && PERIOD_REGEX.test(req.query.period)
      ? req.query.period
      : currentPeriod()
    const ctx = await managerDepartment(req.user!.sub)
    if (!ctx) return res.status(403).json(fail('Manager tidak memiliki departemen'))
    const reports = await departmentEditorReports(ctx.department.id, period)
    return res.json(ok(reports, { total: reports.length }))
  }),
)

/**
 * GET /api/v1/reports/draft?period=YYYY-MM
 * Admin Manager: draft laporan bulanan departemen, di-agregasi otomatis
 * dari aktivitas harian (presensi, cuti, KPI, peringatan). Jika laporan
 * periode tsb sudah tersimpan/diteruskan, kembalikan snapshot tersebut.
 * NOTE: harus terdaftar SEBELUM GET /:id agar 'draft' tidak dianggap id.
 */
reportsRouter.get(
  '/draft',
  authenticate,
  requireRole('admin_manager'),
  asyncHandler(async (req, res) => {
    const period = typeof req.query.period === 'string' && PERIOD_REGEX.test(req.query.period)
      ? req.query.period
      : currentPeriod()

    const ctx = await managerDepartment(req.user!.sub)
    if (!ctx) {
      return res.status(403).json(fail('Manager tidak memiliki departemen'))
    }
    const { department } = ctx

    const existing = await prisma.departmentReport.findUnique({
      where: { department_id_period: { department_id: department.id, period } },
    })
    const editorReports = await departmentEditorReports(department.id, period)

    if (existing) {
      const response: DraftReportData = {
        department_id: department.id,
        department_name: department.name,
        period,
        status: existing.status as ReportStatus,
        persisted: true,
        forwarded_at: existing.forwarded_at?.toISOString() ?? null,
        manager_notes: existing.manager_notes,
        attendance_summary: existing.attendance_summary as unknown as AttendanceSummary,
        kpi_summary: existing.kpi_summary as unknown as KpiSummary,
        leave_summary: existing.leave_summary as unknown as LeaveSummary,
        warning_summary: existing.warning_summary as unknown as WarningSummary,
        reimbursement_summary: existing.reimbursement_summary as unknown as ReimbursementSummary | null,
        editor_reports: existing.status === 'forwarded'
          ? (existing.editor_reports as unknown as EditorReportData[] | null)
          : editorReports,
      }
      return res.json(ok(response))
    }

    const { attendance, kpi, leave, warnings, reimbursement } = await computeSummaries(department.id, period)
    const response: DraftReportData = {
      department_id: department.id,
      department_name: department.name,
      period,
      status: 'draft',
      persisted: false,
      forwarded_at: null,
      manager_notes: null,
      attendance_summary: attendance,
      kpi_summary: kpi,
      leave_summary: leave,
      warning_summary: warnings,
      reimbursement_summary: reimbursement,
      editor_reports: editorReports,
    }
    return res.json(ok(response))
  }),
)

/**
 * POST /api/v1/reports/forward
 * Admin Manager meneruskan draft laporan (agregasi terbaru) ke HR Admin.
 * Snapshot metrik dibekukan saat diteruskan (immutable untuk audit).
 */
reportsRouter.post(
  '/forward',
  authenticate,
  requireRole('admin_manager'),
  validateBody(forwardReportSchema),
  asyncHandler(async (req, res) => {
    const { period, manager_notes } = req.body as { period: string; manager_notes?: string }

    const ctx = await managerDepartment(req.user!.sub)
    if (!ctx) {
      return res.status(403).json(fail('Manager tidak memiliki departemen'))
    }
    const { manager, department } = ctx

    const existing = await prisma.departmentReport.findUnique({
      where: { department_id_period: { department_id: department.id, period } },
    })
    if (existing && existing.status === 'forwarded') {
      return res.status(409).json(fail(`Laporan periode ${period} sudah diteruskan ke HR Admin`))
    }

    // Konsolidasi: snapshot semua laporan individual editor periode ini ikut
    // dibekukan ke dalam laporan departemen, lalu ditandai 'consolidated'.
    const editorReports = await departmentEditorReports(department.id, period)

    const { attendance, kpi, leave, warnings, reimbursement } = await computeSummaries(department.id, period)
    const data = {
      attendance_summary: attendance as object,
      kpi_summary: kpi as object,
      leave_summary: leave as object,
      warning_summary: warnings as object,
      reimbursement_summary: reimbursement as object,
      editor_reports: editorReports as unknown as object,
      manager_notes: manager_notes || null,
      status: 'forwarded',
      forwarded_at: new Date(),
    }

    const report = existing
      ? await prisma.departmentReport.update({
          where: { id: existing.id },
          data,
          include: {
            department: { select: { name: true } },
            manager: { select: { full_name: true } },
          },
        })
      : await prisma.departmentReport.create({
          data: {
            department_id: department.id,
            manager_id: manager.id,
            period,
            ...data,
          },
          include: {
            department: { select: { name: true } },
            manager: { select: { full_name: true } },
          },
        })

    await prisma.editorReport.updateMany({
      where: { report_id: { in: editorReports.map(r => r.report_id).filter((id): id is string => !!id) } },
      data: { status: 'consolidated' },
    })

    return res.status(201).json(ok(formatReportResponse(report)))
  }),
)

/**
 * GET /api/v1/reports?period=YYYY-MM&department_id=...&status=...
 * List reports dengan filtering
 * - HR Admin/Superadmin: default hanya laporan yang sudah diteruskan (forwarded)
 * - Admin Manager: laporan departemen mereka, semua status
 */
reportsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const { period, department_id, status } = req.query

    const where: Record<string, unknown> = {}

    // Role-based filtering
    if (viewer.role === 'admin_manager') {
      const manager = await prisma.adminManager.findUnique({
        where: { user_id: viewer.sub },
        select: { id: true, departments: { select: { id: true } } },
      })

      if (!manager) {
        return res.json(ok([], { total: 0 }))
      }

      const deptIds = manager.departments.map(d => d.id)
      where.department_id = { in: deptIds }
    } else {
      // HR Admin melihat laporan yang sudah masuk (forwarded) kecuali difilter lain
      where.status = typeof status === 'string' && status ? status : 'forwarded'
    }

    if (typeof status === 'string' && status && viewer.role === 'admin_manager') {
      where.status = status
    }

    if (period && typeof period === 'string') {
      where.period = period
    }

    if (department_id && typeof department_id === 'string') {
      where.department_id = department_id
    }

    const reports = await prisma.departmentReport.findMany({
      where,
      include: {
        department: { select: { name: true } },
        manager: { select: { full_name: true } },
      },
      orderBy: { submitted_at: 'desc' },
      take: 100,
    })

    const formatted = reports.map(r => ({
      id: r.id,
      department_name: r.department.name,
      manager_name: r.manager.full_name,
      period: r.period,
      status: r.status as ReportStatus,
      forwarded_at: r.forwarded_at?.toISOString() ?? null,
      submitted_at: r.submitted_at.toISOString(),
    }))

    return res.json(ok(formatted, { total: formatted.length }))
  }),
)

/**
 * GET /api/v1/reports/:id
 * Get single report detail
 */
reportsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const viewer = req.user!

    const report = await prisma.departmentReport.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } },
        manager: { select: { full_name: true, user_id: true } },
      },
    })

    if (!report) {
      return res.status(404).json(fail('Report tidak ditemukan'))
    }

    // Authorization: HR Admin bisa lihat semua, Admin Manager hanya miliknya
    if (viewer.role === 'admin_manager') {
      if (report.manager.user_id !== viewer.sub) {
        return res.status(403).json(fail('Anda tidak memiliki akses ke report ini'))
      }
    } else if (viewer.role !== 'hr_admin' && viewer.role !== 'superadmin') {
      return res.status(403).json(fail('Anda tidak bisa melihat reports'))
    }

    return res.json(ok(formatReportResponse(report)))
  }),
)

/**
 * Helper: Format report untuk response
 */
function formatReportResponse(report: {
  id: string
  department_id: string
  department: { name: string }
  manager_id: string
  manager: { full_name: string }
  period: string
  status: string
  forwarded_at: Date | null
  attendance_summary: unknown
  kpi_summary: unknown
  leave_summary: unknown
  warning_summary: unknown
  reimbursement_summary: unknown
  editor_reports: unknown
  manager_notes: string | null
  submitted_at: Date
  created_at: Date
  updated_at: Date
}): DepartmentReportData {
  return {
    id: report.id,
    department_id: report.department_id,
    department_name: report.department.name,
    manager_id: report.manager_id,
    manager_name: report.manager.full_name,
    period: report.period,
    status: report.status as ReportStatus,
    forwarded_at: report.forwarded_at?.toISOString() ?? null,
    attendance_summary: report.attendance_summary as AttendanceSummary,
    kpi_summary: report.kpi_summary as KpiSummary,
    leave_summary: report.leave_summary as LeaveSummary,
    warning_summary: report.warning_summary as WarningSummary,
    reimbursement_summary: report.reimbursement_summary as ReimbursementSummary | null,
    editor_reports: report.editor_reports as EditorReportData[] | null,
    manager_notes: report.manager_notes,
    submitted_at: report.submitted_at.toISOString(),
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
  }
}
