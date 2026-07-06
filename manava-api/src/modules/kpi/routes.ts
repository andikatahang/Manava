// KPI tren bulan-ke-bulan. Endpoint mengagregasi KpiSnapshot per departemen ×
// periode agar tampil sebagai satu garis per departemen di grafik.

import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok } from '../../lib/response.js'
import { getOpenAi, isOpenAiConfigured, OPENAI_MODEL } from '../../lib/openai.js'

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

// ── Per-editor tren (garis per editor) ───────────────────────────────────────
interface EditorMonthPoint {
  editor_id: string
  editor_name: string
  department: string
  period: string
  kpi_average: number
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
}

kpiRouter.get(
  '/editors/monthly',
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const editors = await prisma.editor.findMany({ select: { editor_id: true, full_name: true, department: true, user_id: true } })
    const editorById = new Map(editors.map(e => [e.editor_id, e]))

    const rows = await prisma.kpiSnapshot.findMany({ orderBy: [{ period: 'asc' }] })

    let visible = rows
    if (viewer.role === 'admin_manager') {
      const departments = await prisma.department.findMany({
        where: { manager: { user_id: viewer.sub } },
        select: { name: true },
      })
      const owned = new Set(departments.map(d => d.name))
      visible = rows.filter(r => owned.has(r.department))
    } else if (viewer.role === 'editor') {
      const me = editors.find(e => e.user_id === viewer.sub)
      visible = me ? rows.filter(r => r.editor_id === me.editor_id) : []
    }

    const points: EditorMonthPoint[] = visible.map(r => ({
      editor_id: r.editor_id,
      editor_name: editorById.get(r.editor_id)?.full_name ?? 'Editor',
      department: r.department,
      period: r.period,
      kpi_average: r.kpi_average,
      avg_client_rating: r.avg_client_rating,
      completion_rate: r.completion_rate,
      manager_rating: r.manager_rating,
    }))
    res.json(ok(points, { total: points.length }))
  }),
)

// ── Rekomendasi AI berbasis tren departemen ─────────────────────────────────
// Hanya HR admin/superadmin. Tanpa OPENAI_API_KEY fallback ke ringkasan
// deterministik dari data (jangan pernah menggantungkan flow ke API luar).
interface Recommendation {
  department: string
  priority: 'high' | 'medium' | 'low'
  action: string
  rationale: string
}
interface RecommendationResponse {
  source: 'openai' | 'heuristic'
  summary: string
  recommendations: Recommendation[]
  generated_at: string
}

function heuristicRecommendation(byDept: Map<string, { latest: number; delta: number; band: string }>): RecommendationResponse {
  const items: Recommendation[] = []
  for (const [dept, s] of byDept) {
    if (s.latest < 3.5 || s.delta < -0.2) {
      items.push({
        department: dept, priority: 'high',
        action: 'Jadwalkan sesi 1-on-1 dengan manajer & tinjau distribusi beban proyek.',
        rationale: `KPI terkini ${s.latest.toFixed(2)} (perubahan ${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(2)} dalam 6 bulan) — di bawah target 3.5 atau menurun tajam.`,
      })
    } else if (s.delta < 0) {
      items.push({
        department: dept, priority: 'medium',
        action: 'Minta manajer laporkan penyebab penurunan pada review Q berikutnya.',
        rationale: `KPI ${s.latest.toFixed(2)} masih layak, tapi tren 6 bulan menurun (${s.delta.toFixed(2)}).`,
      })
    } else if (s.latest >= 4.5 && s.delta >= 0.1) {
      items.push({
        department: dept, priority: 'low',
        action: 'Ambil praktik terbaik departemen ini sebagai referensi cross-training.',
        rationale: `KPI ${s.latest.toFixed(2)} sangat baik dan meningkat ${s.delta.toFixed(2)} dalam 6 bulan.`,
      })
    } else {
      items.push({
        department: dept, priority: 'low',
        action: 'Pertahankan ritme evaluasi bulanan; belum ada tindakan darurat.',
        rationale: `KPI ${s.latest.toFixed(2)} stabil (perubahan ${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(2)}).`,
      })
    }
  }
  items.sort((a, b) => {
    const rank: Record<Recommendation['priority'], number> = { high: 0, medium: 1, low: 2 }
    return rank[a.priority] - rank[b.priority]
  })
  const highs = items.filter(i => i.priority === 'high').length
  const summary = highs > 0
    ? `${highs} departemen butuh perhatian segera — KPI di bawah target atau menurun tajam.`
    : 'Seluruh departemen berada dalam koridor kinerja; fokus pada peningkatan bertahap.'
  return { source: 'heuristic', summary, recommendations: items, generated_at: new Date().toISOString() }
}

kpiRouter.post(
  '/recommendation',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.kpiSnapshot.findMany({ orderBy: [{ period: 'asc' }] })
    // Rangkuman per departemen: KPI terkini + delta 6 bulan.
    const perDept = new Map<string, number[]>()
    const perDeptPeriod = new Map<string, { period: string; sum: number; n: number }[]>()
    for (const r of rows) {
      const arr = perDept.get(r.department) ?? []
      arr.push(r.kpi_average)
      perDept.set(r.department, arr)
      const periods = perDeptPeriod.get(r.department) ?? []
      const found = periods.find(p => p.period === r.period)
      if (found) { found.sum += r.kpi_average; found.n += 1 }
      else periods.push({ period: r.period, sum: r.kpi_average, n: 1 })
      perDeptPeriod.set(r.department, periods)
    }
    const summary = new Map<string, { latest: number; delta: number; band: string }>()
    const trendLines: string[] = []
    for (const [dept, periods] of perDeptPeriod) {
      const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period))
      const monthly = sorted.map(p => ({ period: p.period, avg: p.sum / p.n }))
      const latest = monthly[monthly.length - 1]?.avg ?? 0
      const earliest = monthly[0]?.avg ?? 0
      const delta = latest - earliest
      const band = latest >= 4.5 ? 'excellent' : latest >= 3.5 ? 'good' : 'needs_improvement'
      summary.set(dept, { latest, delta, band })
      trendLines.push(
        `${dept}: ${monthly.map(m => `${m.period}=${m.avg.toFixed(2)}`).join(', ')} (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`,
      )
    }

    if (!isOpenAiConfigured()) {
      res.json(ok(heuristicRecommendation(summary)))
      return
    }

    try {
      const client = getOpenAi()
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Anda asisten HR untuk perusahaan jasa visual (retouching, video edit, color grading, motion graphics, VFX). ' +
              'Berikan rekomendasi keputusan HR Admin berdasarkan tren KPI bulanan per departemen. ' +
              'Balas HANYA JSON valid dengan bentuk: ' +
              '{"summary": string, "recommendations": [{"department": string, "priority": "high"|"medium"|"low", "action": string, "rationale": string}]}. ' +
              'Bahasa jawaban: Indonesia natural, ringkas, actionable. Jangan tambahkan field lain.',
          },
          {
            role: 'user',
            content:
              `Tren KPI 6 bulan (skala 1-5) per departemen:\n${trendLines.join('\n')}\n\n` +
              `Target internal: KPI >= 3.5 = layak, >= 4.5 = sangat baik. ` +
              `Fokus rekomendasi pada departemen yang menurun atau di bawah target, dan sarankan cara mempertahankan yang unggul.`,
          },
        ],
      })
      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw) as { summary?: string; recommendations?: Recommendation[] }
      const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      res.json(ok<RecommendationResponse>({
        source: 'openai',
        summary: parsed.summary ?? 'Rekomendasi HR berdasarkan tren KPI 6 bulan.',
        recommendations: recs,
        generated_at: new Date().toISOString(),
      }))
    } catch (err) {
      console.error('[kpi/recommendation] OpenAI failed, fallback to heuristic:', err)
      res.json(ok(heuristicRecommendation(summary)))
    }
  }),
)
