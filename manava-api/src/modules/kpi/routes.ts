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

// ── Rekomendasi AI: analisis operasional per departemen ─────────────────────
// Hanya HR admin/superadmin. Endpoint mengumpulkan konteks REAL dari DB
// (KPI 6 bulan + peringatan aktif + isu presensi 30 hari + hasil proyek
// 90 hari + sengketa terbuka + cuti pending) dan mengirimkannya sebagai
// input terstruktur ke OpenAI dengan temperature 0 + seed tetap agar setiap
// refresh menghasilkan output yang sama untuk data yang sama.
// Tanpa OPENAI_API_KEY, fallback ke ringkasan deterministik dari data.

interface Recommendation {
  department: string
  priority: 'high' | 'medium' | 'low'
  action: string
  rationale: string
  data_evidence: string[]
}
interface RecommendationResponse {
  source: 'openai' | 'heuristic'
  summary: string
  recommendations: Recommendation[]
  generated_at: string
}

// Konteks operasional per departemen yang jadi input analisis (kaya, dari DB).
interface DeptContext {
  department: string
  editor_count: number
  kpi_trend: number[]              // 6 bulan (Jan..Jun)
  kpi_latest: number
  kpi_delta_6m: number
  band_distribution: { excellent: number; good: number; needs_improvement: number }
  warnings_active: { ringan: number; sedang: number; berat: number }
  attendance_30d: { present: number; late: number; absent: number; incomplete: number; late_pct: number }
  projects_90d: { completed: number; in_progress: number; revision: number; disputed: number; cancelled: number; avg_client_rating: number | null; avg_revisions_per_project: number }
  disputes_open: number
  leave_pending: number
}

async function buildDeptContexts(): Promise<DeptContext[]> {
  // Sumber data — dept ditentukan lewat Editor.department (denormalisasi
  // yang sudah ada di skema).
  const editors = await prisma.editor.findMany({
    where: { status: 'active' },
    select: { editor_id: true, user_id: true, department: true, performance_band: true },
  })
  const editorsByDept = new Map<string, typeof editors>()
  for (const e of editors) {
    const arr = editorsByDept.get(e.department) ?? []
    arr.push(e)
    editorsByDept.set(e.department, arr)
  }

  const snapshots = await prisma.kpiSnapshot.findMany({ orderBy: { period: 'asc' } })

  // Rentang waktu: presensi 30 hari, proyek 90 hari terakhir.
  const now = new Date()
  const t30 = new Date(now.getTime() - 30 * 86_400_000)
  const t90 = new Date(now.getTime() - 90 * 86_400_000)

  const userToDept = new Map<string, string>()
  for (const e of editors) userToDept.set(e.user_id, e.department)
  // Admin manajer punya user_id juga — masuk ke departemen yang ia pegang.
  const managers = await prisma.adminManager.findMany({
    where: { user_id: { not: null } },
    include: { departments: { select: { name: true } } },
  })
  for (const m of managers) {
    if (m.user_id && m.departments[0]) userToDept.set(m.user_id, m.departments[0].name)
  }

  const attendance = await prisma.attendanceRecord.findMany({
    where: { date: { gte: t30 } },
    select: { user_id: true, status: true },
  })

  const warnings = await prisma.warning.findMany({
    where: { status: 'aktif' },
    include: { target: { select: { user_id: true } } },
  })

  const projects = await prisma.project.findMany({
    where: { created_at: { gte: t90 } },
    select: {
      project_id: true, status: true, editor_id: true,
      revisions: { select: { revision_id: true } },
      reviews: { select: { rating: true } },
      disputes: { select: { status: true } },
    },
  })
  const editorIdToDept = new Map(editors.map(e => [e.editor_id, e.department]))

  const leaves = await prisma.leaveRequest.findMany({
    where: { status: 'pending' },
    select: { requester_id: true },
  })

  const contexts: DeptContext[] = []
  for (const dept of editorsByDept.keys()) {
    const deptEditors = editorsByDept.get(dept)!
    const userIds = new Set(deptEditors.map(e => e.user_id))
    // Sertakan manajer departemen di isu presensi & cuti.
    for (const m of managers) {
      if (m.user_id && m.departments.some(d => d.name === dept)) userIds.add(m.user_id)
    }

    // KPI 6 bulan (rata-rata departemen per bulan).
    const perPeriod = new Map<string, { sum: number; n: number }>()
    for (const s of snapshots) {
      if (s.department !== dept) continue
      const cur = perPeriod.get(s.period) ?? { sum: 0, n: 0 }
      cur.sum += s.kpi_average
      cur.n += 1
      perPeriod.set(s.period, cur)
    }
    const periodsSorted = Array.from(perPeriod.entries()).sort(([a], [b]) => a.localeCompare(b))
    const trend = periodsSorted.map(([, v]) => Math.round((v.sum / v.n) * 100) / 100)
    const latest = trend[trend.length - 1] ?? 0
    const earliest = trend[0] ?? 0
    const delta = Math.round((latest - earliest) * 100) / 100

    // Band distribusi (dari performance_band editor).
    const bandDist = { excellent: 0, good: 0, needs_improvement: 0 }
    for (const e of deptEditors) bandDist[e.performance_band] += 1

    // Peringatan aktif per severity.
    const warnCount = { ringan: 0, sedang: 0, berat: 0 }
    for (const w of warnings) {
      const uid = w.target?.user_id ?? w.target_user_id
      if (uid && userIds.has(uid)) warnCount[w.severity] += 1
    }

    // Presensi 30 hari.
    const att = { present: 0, late: 0, absent: 0, incomplete: 0 }
    let attTotal = 0
    for (const a of attendance) {
      if (!userIds.has(a.user_id)) continue
      attTotal += 1
      if (a.status === 'present') att.present += 1
      else if (a.status === 'late') att.late += 1
      else if (a.status === 'absent') att.absent += 1
      else if (a.status === 'incomplete') att.incomplete += 1
    }
    const latePct = attTotal > 0 ? Math.round((att.late / attTotal) * 100) : 0

    // Proyek 90 hari.
    const projStats = { completed: 0, in_progress: 0, revision: 0, disputed: 0, cancelled: 0 }
    let ratingSum = 0, ratingN = 0, revisionSum = 0, projN = 0
    for (const p of projects) {
      if (editorIdToDept.get(p.editor_id) !== dept) continue
      projN += 1
      revisionSum += p.revisions.length
      if (p.status === 'completed') projStats.completed += 1
      else if (p.status === 'in_progress') projStats.in_progress += 1
      else if (p.status === 'revision') projStats.revision += 1
      else if (p.status === 'disputed') projStats.disputed += 1
      else if (p.status === 'cancelled') projStats.cancelled += 1
      for (const r of p.reviews) { ratingSum += r.rating; ratingN += 1 }
    }
    const disputesOpen = projects
      .filter(p => editorIdToDept.get(p.editor_id) === dept)
      .flatMap(p => p.disputes)
      .filter(d => d.status === 'open' || d.status === 'in_mediation').length

    // Cuti pending.
    const leavePending = leaves.filter(l => userIds.has(l.requester_id)).length

    contexts.push({
      department: dept,
      editor_count: deptEditors.length,
      kpi_trend: trend, kpi_latest: latest, kpi_delta_6m: delta,
      band_distribution: bandDist,
      warnings_active: warnCount,
      attendance_30d: { ...att, late_pct: latePct },
      projects_90d: {
        ...projStats,
        avg_client_rating: ratingN > 0 ? Math.round((ratingSum / ratingN) * 100) / 100 : null,
        avg_revisions_per_project: projN > 0 ? Math.round((revisionSum / projN) * 100) / 100 : 0,
      },
      disputes_open: disputesOpen,
      leave_pending: leavePending,
    })
  }
  return contexts.sort((a, b) => a.department.localeCompare(b.department))
}

// Aturan prioritas deterministik — dipakai fallback DAN diberikan ke LLM
// sebagai constraint eksplisit agar keputusannya reproducible.
function classifyPriority(c: DeptContext): 'high' | 'medium' | 'low' {
  const warnsTotal = c.warnings_active.ringan + c.warnings_active.sedang + c.warnings_active.berat
  if (
    c.kpi_latest < 3.5 ||
    c.kpi_delta_6m <= -0.4 ||
    warnsTotal >= 3 ||
    c.warnings_active.berat >= 1 ||
    c.disputes_open >= 1
  ) return 'high'
  if (
    c.kpi_latest < 4.2 ||
    c.kpi_delta_6m < 0 ||
    warnsTotal >= 1 ||
    c.attendance_30d.late_pct >= 10 ||
    c.projects_90d.disputed >= 1
  ) return 'medium'
  return 'low'
}

function buildEvidence(c: DeptContext): string[] {
  const ev: string[] = [
    `KPI Juni: ${c.kpi_latest.toFixed(2)}/5.0`,
    `Perubahan 6 bulan: ${c.kpi_delta_6m >= 0 ? '+' : ''}${c.kpi_delta_6m.toFixed(2)}`,
  ]
  const w = c.warnings_active
  const wTotal = w.ringan + w.sedang + w.berat
  if (wTotal > 0) ev.push(`Peringatan aktif: ${wTotal} (berat ${w.berat}, sedang ${w.sedang}, ringan ${w.ringan})`)
  if (c.attendance_30d.late_pct > 0) ev.push(`Keterlambatan 30 hari: ${c.attendance_30d.late_pct}%`)
  if (c.projects_90d.disputed > 0 || c.disputes_open > 0) {
    ev.push(`Proyek disengketakan 90 hari: ${c.projects_90d.disputed}, sengketa terbuka: ${c.disputes_open}`)
  }
  if (c.projects_90d.avg_client_rating !== null) {
    ev.push(`Rating klien proyek 90 hari: ${c.projects_90d.avg_client_rating.toFixed(2)}/5.0`)
  }
  return ev
}

function heuristicRecommendation(ctx: DeptContext[]): RecommendationResponse {
  const items: Recommendation[] = ctx.map(c => {
    const priority = classifyPriority(c)
    const evidence = buildEvidence(c)
    let action: string
    let rationale: string
    if (priority === 'high') {
      action = c.disputes_open > 0
        ? `Sisipkan proyek sengketa "${c.department}" ke rapat mingguan HR + manajer; audit ulang pipeline QC dan alokasikan lead reviewer.`
        : `Jadwalkan 1-on-1 wajib manajer ${c.department} dengan HR minggu ini; buat rencana perbaikan 30/60/90 hari dan bekukan penerimaan proyek baru sampai KPI naik.`
      rationale = `Departemen memenuhi ambang darurat: KPI Juni ${c.kpi_latest.toFixed(2)} (delta ${c.kpi_delta_6m.toFixed(2)}), ${c.warnings_active.berat + c.warnings_active.sedang + c.warnings_active.ringan} peringatan aktif, ${c.disputes_open} sengketa terbuka.`
    } else if (priority === 'medium') {
      action = c.attendance_30d.late_pct >= 10
        ? `Perketat kepatuhan presensi ${c.department}: kirim briefing kedisiplinan mingguan dan minta manajer mereview jam kerja 3 editor yang paling sering terlambat.`
        : `Minta manajer ${c.department} presentasikan analisis penyebab penurunan KPI pada review Q berikutnya dengan rencana koreksi konkret.`
      rationale = `KPI ${c.kpi_latest.toFixed(2)} masih layak, tapi ada sinyal peringatan (delta ${c.kpi_delta_6m.toFixed(2)}, keterlambatan ${c.attendance_30d.late_pct}%).`
    } else {
      action = c.kpi_latest >= 4.5 && c.kpi_delta_6m >= 0.15
        ? `Angkat praktik terbaik ${c.department} sebagai referensi cross-training kuartal depan dan tinjau bonus performa untuk retensi.`
        : `Pertahankan ritme evaluasi bulanan untuk ${c.department}; tidak ada tindakan darurat, fokus retensi.`
      rationale = `Departemen sehat: KPI ${c.kpi_latest.toFixed(2)}, tren ${c.kpi_delta_6m >= 0 ? 'naik' : 'stabil'} (${c.kpi_delta_6m.toFixed(2)}), band unggul ${c.band_distribution.excellent}/${c.editor_count}.`
    }
    return { department: c.department, priority, action, rationale, data_evidence: evidence }
  })
  items.sort((a, b) => {
    const rank: Record<Recommendation['priority'], number> = { high: 0, medium: 1, low: 2 }
    return rank[a.priority] - rank[b.priority] || a.department.localeCompare(b.department)
  })
  const highs = items.filter(i => i.priority === 'high').length
  const meds = items.filter(i => i.priority === 'medium').length
  const summary = highs > 0
    ? `${highs} departemen memerlukan tindakan segera dan ${meds} perlu pengawasan tambahan berdasarkan KPI 6 bulan, peringatan aktif, dan hasil proyek 90 hari.`
    : `Seluruh departemen berada dalam koridor kinerja aman; ${meds} departemen tetap dalam pengawasan biasa.`
  return { source: 'heuristic', summary, recommendations: items, generated_at: new Date().toISOString() }
}

kpiRouter.post(
  '/recommendation',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  asyncHandler(async (_req, res) => {
    const ctx = await buildDeptContexts()
    if (ctx.length === 0) {
      res.json(ok<RecommendationResponse>({ source: 'heuristic', summary: 'Belum ada data departemen.', recommendations: [], generated_at: new Date().toISOString() }))
      return
    }
    if (!isOpenAiConfigured()) {
      res.json(ok(heuristicRecommendation(ctx)))
      return
    }
    try {
      const client = getOpenAi()
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0,
        top_p: 1,
        seed: 42,
        messages: [
          {
            role: 'system',
            content: [
              'Anda senior HR advisor untuk perusahaan jasa visual di Indonesia (retouching, video editing, color grading, motion graphics, VFX).',
              'Tugas: menghasilkan rekomendasi keputusan HR Admin BERDASARKAN data operasional per departemen yang diberikan — jangan mengarang angka di luar input.',
              '',
              'KELUARAN WAJIB berupa JSON valid dengan schema TEPAT (tidak boleh menambah/mengurangi field):',
              '{',
              '  "summary": string (2-3 kalimat, sebutkan jumlah departemen prioritas high dan penyebab utamanya),',
              '  "recommendations": [',
              '    {',
              '      "department": string (harus sama persis dengan nama pada input),',
              '      "priority": "high" | "medium" | "low",',
              '      "action": string (dimulai dengan kata kerja aksi, spesifik, satu kalimat, dapat langsung dieksekusi HR),',
              '      "rationale": string (2 kalimat, WAJIB menyebut minimal 2 angka spesifik dari data konteks departemen tersebut),',
              '      "data_evidence": string[] (2-4 item, format "metric: value", langsung diambil dari konteks — contoh "KPI Juni: 3.32", "Peringatan aktif: 3")',
              '    }',
              '  ]',
              '}',
              '',
              'ATURAN PRIORITAS WAJIB (patuhi persis, tanpa interpretasi bebas):',
              '- "high" jika salah satu benar: KPI Juni < 3.5, ATAU delta 6 bulan <= -0.4, ATAU total peringatan aktif >= 3, ATAU peringatan berat >= 1, ATAU sengketa terbuka >= 1.',
              '- "medium" jika BUKAN high dan salah satu benar: KPI Juni < 4.2, ATAU delta 6 bulan < 0, ATAU peringatan aktif >= 1, ATAU keterlambatan 30 hari >= 10%, ATAU proyek disengketakan 90 hari >= 1.',
              '- "low" hanya jika semua ambang di atas terpenuhi negatif.',
              '',
              'FORMAT: Bahasa Indonesia natural-formal, ringkas, actionable. Jangan gunakan markdown/list. SETIAP departemen di input HARUS mendapat tepat SATU rekomendasi. Urutkan hasil: high dulu, lalu medium, lalu low, alfabetis per prioritas.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `Tanggal analisis: ${new Date().toISOString().slice(0, 10)} (evaluasi 6 bulan KPI + 30 hari presensi + 90 hari proyek).`,
              '',
              'Konteks operasional per departemen (semua angka berasal dari database, jangan modifikasi):',
              '```json',
              JSON.stringify(ctx, null, 2),
              '```',
              '',
              'Kembalikan JSON sesuai schema.',
            ].join('\n'),
          },
        ],
      })
      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw) as { summary?: string; recommendations?: Recommendation[] }
      const rawRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      // Sanitasi: pastikan setiap dept dari input punya rekomendasi, tanpa
      // dept fiksi. Bila LLM lupa satu departemen, tambal dari heuristik.
      const byDept = new Map(rawRecs.map(r => [r.department, r]))
      const finalRecs: Recommendation[] = ctx.map(c => {
        const r = byDept.get(c.department)
        if (r && r.priority && r.action && r.rationale) {
          return {
            department: c.department,
            priority: r.priority,
            action: String(r.action).trim(),
            rationale: String(r.rationale).trim(),
            data_evidence: Array.isArray(r.data_evidence) && r.data_evidence.length > 0
              ? r.data_evidence.slice(0, 4).map(String)
              : buildEvidence(c),
          }
        }
        // Fallback heuristik untuk dept yang hilang.
        const h = heuristicRecommendation([c]).recommendations[0]!
        return h
      })
      finalRecs.sort((a, b) => {
        const rank: Record<Recommendation['priority'], number> = { high: 0, medium: 1, low: 2 }
        return rank[a.priority] - rank[b.priority] || a.department.localeCompare(b.department)
      })
      res.json(ok<RecommendationResponse>({
        source: 'openai',
        summary: parsed.summary?.trim() ?? heuristicRecommendation(ctx).summary,
        recommendations: finalRecs,
        generated_at: new Date().toISOString(),
      }))
    } catch (err) {
      console.error('[kpi/recommendation] OpenAI failed, fallback to heuristic:', err)
      res.json(ok(heuristicRecommendation(ctx)))
    }
  }),
)
