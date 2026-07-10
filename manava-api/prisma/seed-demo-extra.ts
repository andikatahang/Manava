// seed-demo-extra.ts — Pelengkap seed-demo.ts untuk tabel yang belum terisi:
// ReimbursementClaim, EditorReport, DepartmentReport (MIS), PaymentBatch,
// PayrollSettings & RecruitmentSetting (singleton).
// Jalankan SETELAH prisma:seed dan prisma:seed-demo. Deterministik.
import 'dotenv/config'
import { PrismaClient, BatchStatus } from '@prisma/client'

const prisma = new PrismaClient()

function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const pick = <T>(arr: T[], seed: number): T => arr[Math.floor(rnd(seed) * arr.length)]

const PURPOSES = [
  'Lisensi plugin color grading (bulanan)',
  'Sewa studio foto untuk sesi klien',
  'Langganan stock footage & musik',
  'Upgrade RAM workstation editing',
  'Transportasi meeting klien di Jakarta',
  'Hard disk eksternal 4TB untuk arsip proyek',
  'Kalibrasi monitor referensi warna',
  'Langganan font komersial untuk motion graphics',
]

async function main() {
  await prisma.reimbursementClaim.deleteMany()
  await prisma.editorReport.deleteMany()
  await prisma.departmentReport.deleteMany()
  await prisma.paymentBatch.deleteMany()

  // ── Singleton settings ──────────────────────────────────────────────────
  await prisma.payrollSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
  await prisma.recruitmentSetting.upsert({ where: { id: 'default' }, update: { is_open: true }, create: { id: 'default', is_open: true } })

  const editors = await prisma.editor.findMany({ orderBy: { full_name: 'asc' } })
  const editorUsers = await prisma.user.findMany({ where: { role: 'editor' }, orderBy: { user_id: 'asc' } })
  const managers = await prisma.adminManager.findMany({ include: { user: true } })
  const departments = await prisma.department.findMany({ include: { members: true } })
  const hr = await prisma.user.findFirst({ where: { role: 'hr_admin' } })
  if (!hr) throw new Error('HR admin tidak ditemukan — jalankan prisma:seed dulu.')

  const userByName = new Map(editorUsers.map(u => [u.full_name, u]))
  const editorByUserId = new Map<string, (typeof editors)[number]>()
  for (const e of editors) {
    const u = userByName.get(e.full_name)
    if (u) editorByUserId.set(u.user_id, e)
  }

  // ── Reimbursement claims: ~20 klaim tersebar Juni–Juli ──────────────────
  let claims = 0
  for (let i = 0; i < 20; i++) {
    const u = editorUsers[Math.floor(rnd(900 + i) * editorUsers.length)]
    const status = i % 4 === 0 ? 'pending' : i % 4 === 3 ? 'rejected' : 'approved'
    const dept = departments.find(dp => dp.members.some(m => {
      const e = editorByUserId.get(u.user_id)
      return e && m.editor_id === e.editor_id
    }))
    const mgr = managers.find(m => m.id === dept?.manager_id)
    const created = new Date(Date.UTC(2026, 5 + (i % 2), 2 + (i % 24), 3 + (i % 8)))
    await prisma.reimbursementClaim.create({
      data: {
        user_id: u.user_id,
        amount: (Math.floor(rnd(950 + i) * 28) + 3) * 50_000, // Rp150rb–1,55jt
        purpose: pick(PURPOSES, 970 + i),
        status,
        decided_by: status === 'pending' ? null : (mgr?.user?.user_id ?? hr.user_id),
        decided_at: status === 'pending' ? null : new Date(created.getTime() + 86_400_000 * 2),
        created_at: created,
      },
    })
    claims++
  }

  // ── EditorReport: laporan bulanan Juni 2026 untuk semua staf ────────────
  const PERIOD = '2026-06'
  let eReports = 0
  for (const [idx, u] of editorUsers.entries()) {
    const e = editorByUserId.get(u.user_id)
    if (!e) continue
    const snap = await prisma.kpiSnapshot.findFirst({ where: { editor_id: e.editor_id, period: PERIOD } })
    const att = await prisma.attendanceRecord.findMany({ where: { user_id: u.user_id } })
    const present = att.filter(a => a.status === 'present').length
    const late = att.filter(a => a.status === 'late').length
    const projects = await prisma.project.findMany({ where: { editor_id: e.editor_id }, select: { title: true, status: true } })
    const leaves = await prisma.leaveRequest.findMany({ where: { requester_id: u.user_id } })
    await prisma.editorReport.create({
      data: {
        user_id: u.user_id,
        period: PERIOD,
        status: idx % 3 === 0 ? 'submitted' : 'consolidated',
        kpi_summary: {
          avg_client_rating: snap?.avg_client_rating ?? 4.2,
          completion_rate: snap?.completion_rate ?? 0.9,
          manager_rating: snap?.manager_rating ?? 4.0,
          kpi_average: snap?.kpi_average ?? 4.1,
        },
        attendance_summary: { total_days: att.length, present, late, absent: att.length - present - late, leave: leaves.filter(l => l.status === 'approved').length },
        leave_summary: {
          cuti_approved: leaves.filter(l => l.leave_type === 'cuti' && l.status === 'approved').length,
          izin_approved: leaves.filter(l => l.leave_type === 'izin' && l.status === 'approved').length,
          pending: leaves.filter(l => l.status === 'pending').length,
        },
        project_summary: projects.map(p => ({ title: p.title, status: p.status })),
        editor_notes: idx % 5 === 0 ? 'Fokus bulan ini: mempercepat turnaround revisi minor.' : null,
        submitted_at: new Date(Date.UTC(2026, 6, 1 + (idx % 3), 4)),
      },
    })
    eReports++
  }

  // ── DepartmentReport: MIS Mei (forwarded) + Juni (draft/forwarded) ──────
  let dReports = 0
  for (const [di, dept] of departments.entries()) {
    const memberIds = dept.members.map(m => m.editor_id)
    const memberEditors = editors.filter(e => memberIds.includes(e.editor_id))
    const memberUserIds = memberEditors.map(e => userByName.get(e.full_name)?.user_id).filter((x): x is string => !!x)

    for (const [pi, period] of ['2026-05', '2026-06'].entries()) {
      const snaps = await prisma.kpiSnapshot.findMany({ where: { period, editor_id: { in: memberIds } } })
      const avg = snaps.length ? snaps.reduce((s, k) => s + k.kpi_average, 0) / snaps.length : 4
      const warnings = await prisma.warning.findMany({ where: { target_user_id: { in: memberUserIds } } })
      const leaves = await prisma.leaveRequest.findMany({ where: { requester_id: { in: memberUserIds } } })
      const claimsRows = await prisma.reimbursementClaim.findMany({ where: { user_id: { in: memberUserIds }, status: 'approved' } })
      const isJune = pi === 1
      const forwarded = !isJune || di % 2 === 0 // Mei semua terkirim; Juni selang-seling draft
      await prisma.departmentReport.create({
        data: {
          department_id: dept.id,
          manager_id: dept.manager_id,
          period,
          attendance_summary: {
            total_days: 21, present_count: 21 * memberIds.length - 14 - di, late_count: 9 + di,
            absent_count: 5, present_pct: 93 - di, late_pct: 4 + (di % 3), absent_pct: 3,
          },
          kpi_summary: {
            avg_kpi: Math.round(avg * 10) / 10,
            excellent_count: snaps.filter(s => s.kpi_average >= 4.5).length,
            good_count: snaps.filter(s => s.kpi_average >= 3.5 && s.kpi_average < 4.5).length,
            needs_count: snaps.filter(s => s.kpi_average < 3.5).length,
          },
          leave_summary: {
            approved_count: leaves.filter(l => l.status === 'approved').length,
            rejected_count: leaves.filter(l => l.status === 'rejected').length,
            pending_count: leaves.filter(l => l.status === 'pending').length,
          },
          warning_summary: {
            total_count: warnings.length,
            ringan_count: warnings.filter(w => w.severity === 'ringan').length,
            sedang_count: warnings.filter(w => w.severity === 'sedang').length,
            berat_count: warnings.filter(w => w.severity === 'berat').length,
          },
          reimbursement_summary: {
            approved_count: claimsRows.length,
            approved_total: claimsRows.reduce((s, c) => s + c.amount, 0),
            pending_count: 1,
          },
          manager_notes: isJune ? `Kinerja ${dept.name} stabil; fokus perbaikan kedisiplinan presensi.` : null,
          ai_narrative: `Departemen ${dept.name} mencatat rata-rata KPI ${Math.round(avg * 10) / 10} pada periode ${period}. Kehadiran terjaga di atas 90% dengan beberapa catatan keterlambatan; klaim operasional yang disetujui terkendali.`,
          status: forwarded ? 'forwarded' : 'draft',
          forwarded_at: forwarded ? new Date(Date.UTC(2026, 4 + pi, 28, 8)) : null,
          submitted_at: new Date(Date.UTC(2026, 4 + pi, 27, 6)),
        },
      })
      dReports++
    }
  }

  // ── PaymentBatch: April–Mei completed, Juni pending ─────────────────────
  let batches = 0
  for (const [bi, period] of ['2026-04', '2026-05', '2026-06'].entries()) {
    const slips = await prisma.payslip.findMany({ where: { period_start: { gte: new Date(`${period}-01T00:00:00Z`), lt: new Date(Date.UTC(2026, 4 + bi, 1)) } } })
    const rows = slips.length ? slips : await prisma.payslip.findMany({ take: 50, skip: bi * 50, orderBy: { payslip_id: 'asc' } })
    const total = rows.reduce((s, p) => s + p.net_salary, 0)
    const done = period !== '2026-06'
    const batch = await prisma.paymentBatch.create({
      data: {
        period,
        total_amount: total,
        payslip_count: rows.length,
        status: done ? BatchStatus.completed : BatchStatus.pending,
        created_by: hr.user_id,
        created_at: new Date(Date.UTC(2026, 3 + bi, 28, 7)),
        processed_at: done ? new Date(Date.UTC(2026, 3 + bi, 28, 9)) : null,
      },
    })
    await prisma.payslip.updateMany({ where: { payslip_id: { in: rows.map(r => r.payslip_id) } }, data: { payment_batch_id: batch.batch_id } })
    batches++
  }

  console.log(`💸 ${claims} klaim reimbursement`)
  console.log(`📋 ${eReports} laporan bulanan staf (EditorReport ${PERIOD})`)
  console.log(`🏢 ${dReports} laporan departemen MIS (Mei & Juni)`)
  console.log(`🏦 ${batches} payment batch payroll (April–Juni)`)
  console.log('✅ Seed demo tambahan selesai.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
