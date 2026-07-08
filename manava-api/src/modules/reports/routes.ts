// API routes untuk department reporting

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
} from './aggregator.js'
import type { DepartmentReportData, CreateReportRequest, AttendanceSummary, KpiSummary, LeaveSummary, WarningSummary } from './types.js'

export const reportsRouter = Router()

// Validation schema
const createReportSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  manager_notes: z.string().optional(),
})

/**
 * POST /api/v1/reports
 * Admin Manager generates a report untuk departemen mereka
 */
reportsRouter.post(
  '/',
  authenticate,
  requireRole('admin_manager'),
  validateBody(createReportSchema),
  asyncHandler(async (req, res) => {
    const managerId = req.user!.sub
    const { period, manager_notes } = req.body as CreateReportRequest

    // Get manager's department
    const manager = await prisma.adminManager.findUnique({
      where: { user_id: managerId },
      include: { departments: true },
    })

    if (!manager || manager.departments.length === 0) {
      return res.status(403).json(fail('Manager tidak memiliki departemen'))
    }

    const department = manager.departments[0]!
    const [year, month] = period.split('-').map(Number)
    const periodStart = new Date(year!, month! - 1, 1)
    const periodEnd = new Date(year!, month!, 0, 23, 59, 59)

    // Check if report already exists for this period
    const existing = await prisma.departmentReport.findUnique({
      where: {
        department_id_period: {
          department_id: department.id,
          period,
        },
      },
    })

    if (existing) {
      return res.status(409).json(fail(`Laporan untuk periode ${period} sudah ada`))
    }

    // Compute all metrics
    const [attendance, kpi, leave, warnings] = await Promise.all([
      computeAttendanceSummary(department.id, periodStart, periodEnd),
      computeKpiSummary(department.id),
      computeLeaveSummary(department.id, periodStart, periodEnd),
      computeWarningSummary(department.id, periodStart, periodEnd),
    ])

    // Create report
    const report = await prisma.departmentReport.create({
      data: {
        department_id: department.id,
        manager_id: manager.id,
        period,
        attendance_summary: attendance as object,
        kpi_summary: kpi as object,
        leave_summary: leave as object,
        warning_summary: warnings as object,
        manager_notes: manager_notes || null,
      },
      include: {
        department: { select: { name: true } },
        manager: { select: { full_name: true } },
      },
    })

    const response = await formatReportResponse(report)
    return res.status(201).json(ok(response))
  }),
)

/**
 * GET /api/v1/reports?period=YYYY-MM&department_id=...
 * List reports dengan filtering
 * - HR Admin: lihat semua reports
 * - Admin Manager: hanya lihat reports dari departemen mereka
 */
reportsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const { period, department_id } = req.query

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
    }

    // Optional filters
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

    const response = await formatReportResponse(report)
    return res.json(ok(response))
  }),
)

/**
 * Helper: Format report untuk response
 */
async function formatReportResponse(report: {
  id: string
  department_id: string
  department: { name: string }
  manager_id: string
  manager: { full_name: string }
  period: string
  attendance_summary: unknown
  kpi_summary: unknown
  leave_summary: unknown
  warning_summary: unknown
  manager_notes: string | null
  submitted_at: Date
  created_at: Date
  updated_at: Date
}): Promise<DepartmentReportData> {
  return {
    id: report.id,
    department_id: report.department_id,
    department_name: report.department.name,
    manager_id: report.manager_id,
    manager_name: report.manager.full_name,
    period: report.period,
    attendance_summary: report.attendance_summary as AttendanceSummary,
    kpi_summary: report.kpi_summary as KpiSummary,
    leave_summary: report.leave_summary as LeaveSummary,
    warning_summary: report.warning_summary as WarningSummary,
    manager_notes: report.manager_notes,
    submitted_at: report.submitted_at.toISOString(),
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
  }
}
