// KPI tren bulan-ke-bulan. Endpoint mengagregasi KpiSnapshot per departemen ×
// periode agar tampil sebagai satu garis per departemen di grafik.

import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'

export const kpiRouter = Router()

interface DeptMonthPoint {
  department: string
  period: string
  kpi_average: number
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
  editor_count: number
}

// GET /api/v1/kpi/monthly — rata-rata KPI per departemen per bulan.
// Admin manajer hanya melihat departemen yang ia kelola; role lain (HR admin,
// superadmin) melihat semuanya. Editor tidak butuh grafik ini di scope-nya —
// tetap boleh mengakses tapi hasilnya adalah agregat departemen tempat ia
// terdaftar.
kpiRouter.get(
  '/monthly',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const rows = await prisma.kpiSnapshot.findMany({
      orderBy: [{ period: 'asc' }, { department: 'asc' }],
    })

    let visible = rows
    if (viewer.role === 'admin_manager') {
      const departments = await prisma.department.findMany({
        where: { manager: { user_id: viewer.sub } },
        select: { name: true },
      })
      const owned = new Set(departments.map(d => d.name))
      visible = rows.filter(r => owned.has(r.department))
    } else if (viewer.role === 'editor') {
      const editor = await prisma.editor.findUnique({ where: { user_id: viewer.sub }, select: { department: true } })
      if (editor) visible = rows.filter(r => r.department === editor.department)
      else visible = []
    }

    // Agregasi (rata-rata sederhana) per (department, period).
    const buckets = new Map<string, { r: number; c: number; m: number; k: number; n: number; d: string; p: string }>()
    for (const s of visible) {
      const key = `${s.department}|${s.period}`
      const cur = buckets.get(key) ?? { r: 0, c: 0, m: 0, k: 0, n: 0, d: s.department, p: s.period }
      cur.r += s.avg_client_rating
      cur.c += s.completion_rate
      cur.m += s.manager_rating
      cur.k += s.kpi_average
      cur.n += 1
      buckets.set(key, cur)
    }

    const points: DeptMonthPoint[] = Array.from(buckets.values()).map(b => ({
      department: b.d,
      period: b.p,
      avg_client_rating: Math.round((b.r / b.n) * 100) / 100,
      completion_rate: Math.round(b.c / b.n),
      manager_rating: Math.round((b.m / b.n) * 100) / 100,
      kpi_average: Math.round((b.k / b.n) * 100) / 100,
      editor_count: b.n,
    }))
    points.sort((a, b) => a.period.localeCompare(b.period) || a.department.localeCompare(b.department))

    res.json(ok(points, { total: points.length }))
  }),
)
