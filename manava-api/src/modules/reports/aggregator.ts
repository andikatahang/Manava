// Helper functions untuk aggregate department metrics untuk report generation

import { prisma } from '../../lib/prisma.js'
import type {
  AttendanceSummary, KpiSummary, LeaveSummary, WarningSummary, ReimbursementSummary,
  EditorReportKpi, EditorReportAttendance, EditorReportLeave, EditorReportProject,
} from './types.js'

/**
 * Snapshot laporan bulanan individual seorang editor (KPI, presensi, cuti,
 * rekap proyek) — dihitung otomatis dari data harian.
 */
export async function computeEditorSnapshot(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{
  editor_name: string
  department: string
  kpi: EditorReportKpi
  attendance: EditorReportAttendance
  leave: EditorReportLeave
  projects: EditorReportProject[]
} | null> {
  const editor = await prisma.editor.findUnique({
    where: { user_id: userId },
    include: { metrics: true },
  })
  if (!editor) return null

  const [records, leaves, projects] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { user_id: userId, date: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: { requester_id: userId, created_at: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.project.findMany({
      where: {
        editor_id: editor.editor_id,
        OR: [
          { created_at: { gte: periodStart, lte: periodEnd } },
          { status: { in: ['in_progress', 'in_review', 'revision'] } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { title: true, status: true },
    }),
  ])

  const count = (s: string) => records.filter(r => r.status === s).length
  const approved = leaves.filter(l => l.status === 'approved')

  return {
    editor_name: editor.full_name,
    department: editor.department,
    kpi: {
      avg_client_rating: editor.metrics?.avg_client_rating ?? 0,
      completion_rate: editor.metrics?.completion_rate ?? 0,
      manager_rating: editor.metrics?.manager_rating ?? 0,
      kpi_average: editor.metrics?.kpi_average ?? 0,
    },
    attendance: {
      total_days: records.length,
      present: count('present'),
      late: count('late'),
      absent: count('absent'),
      leave: count('leave'),
    },
    leave: {
      cuti_approved: approved.filter(l => l.leave_type === 'cuti').length,
      izin_approved: approved.filter(l => l.leave_type === 'izin').length,
      pending: leaves.filter(l => l.status === 'pending').length,
    },
    projects: projects.map(p => ({ title: p.title, status: p.status })),
  }
}

/**
 * Compute attendance metrics untuk departemen dalam periode tertentu
 */
export async function computeAttendanceSummary(
  departmentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<AttendanceSummary> {
  // Get all editors di departemen
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    include: { editor: { include: { user: true } } },
  })

  const userIds = members.map(m => m.editor.user_id)

  // Get attendance records untuk periode ini
  const records = await prisma.attendanceRecord.findMany({
    where: {
      user_id: { in: userIds },
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  // Aggregate by status
  const statusCounts = {
    present: 0, late: 0, absent: 0, leave: 0, other: 0,
  }
  records.forEach(r => {
    if (r.status === 'present') statusCounts.present += 1
    else if (r.status === 'late') statusCounts.late += 1
    else if (r.status === 'absent') statusCounts.absent += 1
    else if (r.status === 'leave') statusCounts.leave += 1
    else statusCounts.other += 1
  })

  const totalDays = records.length
  const divisor = totalDays || 1

  // Top 3 editors by present count
  const byEditor = new Map<string, number>()
  records.forEach(r => {
    if (r.status === 'present') {
      byEditor.set(r.user_id, (byEditor.get(r.user_id) ?? 0) + 1)
    }
  })

  const topEditors = Array.from(byEditor.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count]) => {
      const member = members.find(m => m.editor.user_id === userId)
      return { name: member?.editor.full_name ?? 'Unknown', present_count: count }
    })

  return {
    total_days: totalDays,
    present_count: statusCounts.present,
    late_count: statusCounts.late,
    absent_count: statusCounts.absent,
    leave_count: statusCounts.leave,
    present_pct: Math.round((statusCounts.present / divisor) * 100),
    late_pct: Math.round((statusCounts.late / divisor) * 100),
    absent_pct: Math.round((statusCounts.absent / divisor) * 100),
    leave_pct: Math.round((statusCounts.leave / divisor) * 100),
    top_editors: topEditors,
  }
}

/**
 * Compute KPI metrics untuk departemen
 */
export async function computeKpiSummary(
  departmentId: string,
): Promise<KpiSummary> {
  // Get all editors di departemen dengan metrics
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    include: {
      editor: {
        include: { metrics: true },
      },
    },
  })

  const metricsData = members
    .map(m => ({ ...m.editor.metrics, name: m.editor.full_name }))
    .filter((m): m is any => !!m)

  const total = metricsData.length || 1
  const avgKpi = metricsData.length > 0
    ? metricsData.reduce((sum, m) => sum + (m.kpi_average || 0), 0) / total
    : 0

  const bandCounts = {
    excellent: metricsData.filter(m => m.performance_band === 'excellent').length,
    good: metricsData.filter(m => m.performance_band === 'good').length,
    needs: metricsData.filter(m => m.performance_band === 'needs_improvement').length,
  }

  // TODO: Track KPI changes month-over-month (would need KpiSnapshot history)
  // For now, return empty arrays
  const improved: Array<{ name: string; current_kpi: number; change: number }> = []
  const declined: Array<{ name: string; current_kpi: number; change: number }> = []

  return {
    avg_kpi: Number(avgKpi.toFixed(2)),
    excellent_count: bandCounts.excellent,
    good_count: bandCounts.good,
    needs_count: bandCounts.needs,
    improved_editors: improved,
    declined_editors: declined,
  }
}

/**
 * Compute leave metrics untuk departemen dalam periode tertentu
 */
export async function computeLeaveSummary(
  departmentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<LeaveSummary> {
  // Get all editors di departemen
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    select: { editor: { select: { user_id: true } } },
  })

  const userIds = members.map(m => m.editor.user_id)

  // Get leave requests untuk periode ini
  const requests = await prisma.leaveRequest.findMany({
    where: {
      requester_id: { in: userIds },
      created_at: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  const approved = requests.filter(r => r.status === 'approved')
  const rejected = requests.filter(r => r.status === 'rejected')
  const pending = requests.filter(r => r.status === 'pending')

  const cutiApproved = approved.filter(r => r.leave_type === 'cuti').length
  const izinApproved = approved.filter(r => r.leave_type === 'izin').length

  return {
    approved_count: approved.length,
    rejected_count: rejected.length,
    pending_count: pending.length,
    cuti_approved: cutiApproved,
    izin_approved: izinApproved,
  }
}

/**
 * Compute reimbursement metrics (SUM klaim disetujui) untuk departemen
 * dalam periode tertentu
 */
export async function computeReimbursementSummary(
  departmentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ReimbursementSummary> {
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    select: { editor: { select: { user_id: true } } },
  })
  const userIds = members.map(m => m.editor.user_id)

  const claims = await prisma.reimbursementClaim.findMany({
    where: {
      user_id: { in: userIds },
      created_at: { gte: periodStart, lte: periodEnd },
    },
  })

  const approved = claims.filter(c => c.status === 'approved')
  return {
    approved_count: approved.length,
    approved_total: approved.reduce((sum, c) => sum + c.amount, 0),
    pending_count: claims.filter(c => c.status === 'pending').length,
  }
}

/**
 * Compute warning metrics untuk departemen dalam periode tertentu
 */
export async function computeWarningSummary(
  departmentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<WarningSummary> {
  // Get all editors di departemen
  const members = await prisma.departmentMember.findMany({
    where: { department_id: departmentId },
    select: { editor: { select: { user_id: true } } },
  })

  const userIds = members.map(m => m.editor.user_id)

  // Get warnings untuk periode ini
  const warnings = await prisma.warning.findMany({
    where: {
      target_user_id: { in: userIds },
      issued_at: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  const severityCounts = {
    ringan: warnings.filter(w => w.severity === 'ringan').length,
    sedang: warnings.filter(w => w.severity === 'sedang').length,
    berat: warnings.filter(w => w.severity === 'berat').length,
  }

  // Repeat offenders (users with >1 warning)
  const byUser = new Map<string, number>()
  warnings.forEach(w => {
    if (!w.target_user_id) return
    byUser.set(w.target_user_id, (byUser.get(w.target_user_id) ?? 0) + 1)
  })

  const offenders: Array<{ name: string; count: number }> = []
  for (const [userId, count] of byUser.entries()) {
    if (count > 1) {
      const member = members.find(m => m.editor.user_id === userId)
      if (member) {
        offenders.push({ name: member.editor.user_id, count })
      }
    }
  }
  offenders.sort((a, b) => b.count - a.count)

  return {
    total_count: warnings.length,
    ringan_count: severityCounts.ringan,
    sedang_count: severityCounts.sedang,
    berat_count: severityCounts.berat,
    repeat_offenders: offenders.slice(0, 5),
  }
}
