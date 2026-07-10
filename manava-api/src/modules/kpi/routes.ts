// KPI tren bulan-ke-bulan. Endpoint mengagregasi KpiSnapshot per departemen ×
// periode agar tampil sebagai satu garis per departemen di grafik.

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
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
  // Agregat departemen = informasi taktis/strategis; editor cukup KPI pribadi (/my-trend).
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
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

// ── Tren rating klien granular (hari/minggu) ────────────────────────────────
// Beda dari /monthly: KpiSnapshot hanya punya granularitas bulanan (satu
// baris per editor per bulan), jadi tidak bisa dipecah ke hari/minggu.
// Endpoint ini menghitung rata-rata rating klien LANGSUNG dari Review.rating +
// Review.created_at (data asli, per kejadian review) — satu-satunya komponen
// KPI yang punya timestamp granular. completion_rate/manager_rating tidak
// disertakan karena tidak ada riwayat harian/mingguannya di skema.
interface ReviewTrendPoint {
  department: string
  period: string // "YYYY-MM-DD" — tanggal (hari) atau awal minggu (Senin)
  avg_client_rating: number
  review_count: number
}

function dayBucket(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function weekBucket(d: Date): string {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (day.getUTCDay() + 6) % 7 // 0 = Senin
  day.setUTCDate(day.getUTCDate() - dow)
  return day.toISOString().slice(0, 10)
}

kpiRouter.get(
  '/reviews-trend',
  authenticate,
  // Tren rating lintas editor hanya untuk level taktis/strategis.
  requireRole('admin_manager', 'hr_admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const granularity = req.query.granularity === 'week' ? 'week' : 'day'

    const [reviews, editors] = await Promise.all([
      prisma.review.findMany({
        select: { rating: true, created_at: true, project: { select: { editor_id: true } } },
        orderBy: { created_at: 'asc' },
      }),
      prisma.editor.findMany({ select: { editor_id: true, department: true, user_id: true } }),
    ])
    const deptByEditor = new Map(editors.map(e => [e.editor_id, e.department]))

    let ownedDepts: Set<string> | null = null
    if (viewer.role === 'admin_manager') {
      const departments = await prisma.department.findMany({
        where: { manager: { user_id: viewer.sub } },
        select: { name: true },
      })
      ownedDepts = new Set(departments.map(d => d.name))
    } else if (viewer.role === 'editor') {
      const me = editors.find(e => e.user_id === viewer.sub)
      ownedDepts = new Set(me ? [me.department] : [])
    }

    const bucketOf = granularity === 'week' ? weekBucket : dayBucket
    const buckets = new Map<string, { sum: number; n: number; d: string; p: string }>()
    for (const r of reviews) {
      const dept = deptByEditor.get(r.project.editor_id)
      if (!dept) continue
      if (ownedDepts && !ownedDepts.has(dept)) continue
      const period = bucketOf(r.created_at)
      const key = `${dept}|${period}`
      const cur = buckets.get(key) ?? { sum: 0, n: 0, d: dept, p: period }
      cur.sum += r.rating
      cur.n += 1
      buckets.set(key, cur)
    }

    const points: ReviewTrendPoint[] = Array.from(buckets.values()).map(b => ({
      department: b.d,
      period: b.p,
      avg_client_rating: Math.round((b.sum / b.n) * 100) / 100,
      review_count: b.n,
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

// ── ESS: Tren KPI personal editor (hari/minggu/bulan) ───────────────────────
// Endpoint khusus untuk halaman ESS editor — menampilkan riwayat KPI mereka
// sendiri dengan granularitas yang dapat dipilih. Hanya editor yang login
// yang bisa melihat data ini (tidak bisa melihat editor lain).
interface MyKpiTrendPoint {
  period: string // "YYYY-MM-DD" untuk day/week, "YYYY-MM" untuk month
  kpi_average: number | null
  avg_client_rating: number | null
  completion_rate: number | null
  manager_rating: number | null
  review_count: number
  project_count: number
}

kpiRouter.get(
  '/my-trend',
  authenticate,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const granularity = req.query.granularity === 'week' ? 'week' : req.query.granularity === 'day' ? 'day' : 'month'

    // Cari editor_id dari user yang login
    const editor = await prisma.editor.findUnique({
      where: { user_id: viewer.sub },
      select: { editor_id: true },
    })
    if (!editor) {
      res.json(ok([]))
      return
    }

    if (granularity === 'month') {
      // Untuk bulan: ambil dari KpiSnapshot tapi JUGA hitung review_count & project_count dari Reviews/Projects
      const snapshots = await prisma.kpiSnapshot.findMany({
        where: { editor_id: editor.editor_id },
        orderBy: { period: 'asc' },
        select: {
          period: true,
          kpi_average: true,
          avg_client_rating: true,
          completion_rate: true,
          manager_rating: true,
        },
      })

      // Juga query Projects dan Reviews untuk mendapatkan counts per bulan
      const projects = await prisma.project.findMany({
        where: { editor_id: editor.editor_id },
        include: {
          reviews: { select: { rating: true, created_at: true } },
        },
      })

      // Hitung counts per bulan (YYYY-MM)
      function monthBucket(d: Date): string {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      }

      const countsByMonth = new Map<string, { reviewCount: number; projectIds: Set<string> }>()

      for (const p of projects) {
        // Hitung reviews per bulan (berdasarkan tanggal review)
        for (const r of p.reviews) {
          const period = monthBucket(r.created_at)
          const cur = countsByMonth.get(period) ?? { reviewCount: 0, projectIds: new Set() }
          cur.reviewCount += 1
          cur.projectIds.add(p.project_id)
          countsByMonth.set(period, cur)
        }
        // Jika project completed, masukkan ke bulan completion
        if (p.completed_at) {
          const period = monthBucket(p.completed_at)
          const cur = countsByMonth.get(period) ?? { reviewCount: 0, projectIds: new Set() }
          cur.projectIds.add(p.project_id)
          countsByMonth.set(period, cur)
        }
      }

      const points: MyKpiTrendPoint[] = snapshots.map(s => {
        const counts = countsByMonth.get(s.period) ?? { reviewCount: 0, projectIds: new Set() }
        return {
          period: s.period,
          kpi_average: s.kpi_average,
          avg_client_rating: s.avg_client_rating,
          completion_rate: s.completion_rate,
          manager_rating: s.manager_rating,
          review_count: counts.reviewCount,
          project_count: counts.projectIds.size,
        }
      })

      res.json(ok(points, { total: points.length }))
      return
    }

    // Untuk day/week: hitung dari Review + Project secara real-time
    const projects = await prisma.project.findMany({
      where: { editor_id: editor.editor_id },
      include: {
        reviews: { select: { rating: true, created_at: true } },
      },
      orderBy: { created_at: 'asc' },
    })

    const bucketOf = granularity === 'week' ? weekBucket : dayBucket
    const buckets = new Map<string, { ratingSum: number; ratingN: number; projectIds: Set<string> }>()

    for (const p of projects) {
      // Gunakan tanggal review untuk rating (saat feedback diberikan)
      for (const r of p.reviews) {
        const period = bucketOf(r.created_at)
        const cur = buckets.get(period) ?? { ratingSum: 0, ratingN: 0, projectIds: new Set() }
        cur.ratingSum += r.rating
        cur.ratingN += 1
        cur.projectIds.add(p.project_id)
        buckets.set(period, cur)
      }
      // Hitung project yang completed di periode ini (untuk completion_rate nantinya)
      if (p.completed_at) {
        const period = bucketOf(p.completed_at)
        const cur = buckets.get(period) ?? { ratingSum: 0, ratingN: 0, projectIds: new Set() }
        cur.projectIds.add(p.project_id)
        buckets.set(period, cur)
      }
    }

    const points: MyKpiTrendPoint[] = Array.from(buckets.entries())
      .map(([period, data]) => ({
        period,
        kpi_average: null, // KPI bulanan tidak bisa dihitung harian/mingguan tanpa snapshot
        avg_client_rating: data.ratingN > 0 ? Math.round((data.ratingSum / data.ratingN) * 100) / 100 : null,
        completion_rate: null, // Completion rate perlu data assignment, tidak ada di scope ini
        manager_rating: null, // Manager rating hanya ada di snapshot bulanan
        review_count: data.ratingN,
        project_count: data.projectIds.size,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    res.json(ok(points, { total: points.length }))
  }),
)

// ── AI Insight Personal untuk Editor ─────────────────────────────────────────
// Endpoint khusus ESS editor: analisis performa personal + rekomendasi actionable
// untuk membantu pengambilan keputusan dan motivasi. Hanya bisa diakses editor
// yang login, melihat data mereka sendiri.

interface EditorInsight {
  summary: string
  performance_level: 'excellent' | 'good' | 'needs_improvement'
  trend: 'improving' | 'stable' | 'declining'
  key_strengths: string[]
  areas_for_improvement: string[]
  actionable_tips: string[]
  motivational_message: string
}

interface EditorInsightResponse {
  source: 'openai' | 'heuristic'
  insight: EditorInsight
  generated_at: string
}

// Konteks performa editor untuk AI analysis
interface EditorContext {
  editor_name: string
  department: string
  kpi_trend_6m: number[] // 6 bulan terakhir
  kpi_latest: number
  kpi_delta_6m: number
  avg_client_rating: number
  total_projects: number
  total_reviews: number
  completed_projects: number
  disputed_projects: number
  performance_band: 'excellent' | 'good' | 'needs_improvement'
  recent_ratings: number[] // 5 rating terakhir
}

async function buildEditorContext(editorId: string): Promise<EditorContext | null> {
  const editor = await prisma.editor.findUnique({
    where: { editor_id: editorId },
    select: { full_name: true, department: true, performance_band: true },
  })
  if (!editor) return null

  // KPI 6 bulan terakhir
  const snapshots = await prisma.kpiSnapshot.findMany({
    where: { editor_id: editorId },
    orderBy: { period: 'desc' },
    take: 6,
    select: { period: true, kpi_average: true, avg_client_rating: true },
  })
  snapshots.reverse() // oldest first

  const trend = snapshots.map(s => s.kpi_average)
  const latest = trend[trend.length - 1] ?? 0
  const earliest = trend[0] ?? 0
  const delta = Math.round((latest - earliest) * 100) / 100

  // Projects & reviews
  const projects = await prisma.project.findMany({
    where: { editor_id: editorId },
    include: { reviews: { select: { rating: true, created_at: true } } },
  })

  const completedProjects = projects.filter(p => p.status === 'completed').length
  const disputedProjects = projects.filter(p => p.status === 'disputed').length
  const allReviews = projects.flatMap(p => p.reviews)
  const recentReviews = allReviews
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 5)
    .map(r => r.rating)

  const avgRating =
    allReviews.length > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 100) / 100
      : 0

  return {
    editor_name: editor.full_name,
    department: editor.department,
    kpi_trend_6m: trend,
    kpi_latest: latest,
    kpi_delta_6m: delta,
    avg_client_rating: avgRating,
    total_projects: projects.length,
    total_reviews: allReviews.length,
    completed_projects: completedProjects,
    disputed_projects: disputedProjects,
    performance_band: editor.performance_band,
    recent_ratings: recentReviews,
  }
}

function heuristicEditorInsight(ctx: EditorContext): EditorInsight {
  const kpi = ctx.kpi_latest
  const delta = ctx.kpi_delta_6m
  const rating = ctx.avg_client_rating

  // Determine performance level
  let level: EditorInsight['performance_level']
  if (kpi >= 4.5 && rating >= 4.5) level = 'excellent'
  else if (kpi >= 4.0 && rating >= 4.0) level = 'good'
  else level = 'needs_improvement'

  // Determine trend
  let trend: EditorInsight['trend']
  if (delta >= 0.3) trend = 'improving'
  else if (delta <= -0.3) trend = 'declining'
  else trend = 'stable'

  // Key strengths
  const strengths: string[] = []
  if (rating >= 4.5) strengths.push(`Rating klien sangat baik (${rating.toFixed(1)}/5.0)`)
  if (ctx.completed_projects >= 10) strengths.push(`${ctx.completed_projects} proyek selesai sukses`)
  if (ctx.disputed_projects === 0) strengths.push('Tidak ada proyek disengketakan')
  if (delta >= 0.5) strengths.push(`Peningkatan signifikan dalam 6 bulan (+${delta.toFixed(1)})`)
  if (ctx.recent_ratings.every(r => r >= 4)) strengths.push('Konsisten mendapat rating tinggi dari klien')

  // Areas for improvement
  const improvements: string[] = []
  if (rating < 4.0) improvements.push('Rating klien perlu ditingkatkan')
  if (ctx.disputed_projects > 0) improvements.push(`${ctx.disputed_projects} proyek mengalami sengketa`)
  if (delta < -0.3) improvements.push('Tren KPI menurun dalam 6 bulan terakhir')
  if (ctx.recent_ratings.some(r => r < 3)) improvements.push('Beberapa review klien terakhir kurang memuaskan')

  // Actionable tips
  const tips: string[] = []
  if (level === 'excellent') {
    tips.push('Pertahankan standar kualitas tinggi Anda dengan dokumentasi best practices')
    tips.push('Pertimbangkan mentoring staf junior untuk berbagi pengalaman')
    tips.push('Eksplorasi teknik atau tools baru untuk terus berkembang')
  } else if (level === 'good') {
    tips.push('Review feedback klien secara detail untuk identifikasi pola improvement')
    tips.push('Komunikasi proaktif dengan klien di awal proyek untuk alignment ekspektasi')
    tips.push('Alokasikan waktu untuk refine deliverable sebelum submit final')
  } else {
    tips.push('Jadwalkan 1-on-1 dengan manager untuk diskusi tantangan spesifik')
    tips.push('Fokus pada quality over speed - pastikan deliverable memenuhi brief')
    tips.push('Minta feedback konstruktif dari staf senior di departemen Anda')
  }

  if (trend === 'declining') {
    tips.push('Identifikasi penyebab penurunan: workload, tools, komunikasi klien?')
  }

  // Motivational message
  let message: string
  if (level === 'excellent' && trend === 'improving') {
    message = `Luar biasa, ${ctx.editor_name}! Performa Anda konsisten cemerlang dan terus meningkat. Anda adalah role model di ${ctx.department}. Terus pertahankan momentum ini! 🌟`
  } else if (level === 'excellent') {
    message = `Excellent work, ${ctx.editor_name}! Rating ${rating.toFixed(1)}/5.0 menunjukkan klien sangat puas dengan kualitas Anda. Pertahankan standar tinggi ini! 💪`
  } else if (level === 'good' && trend === 'improving') {
    message = `Great progress, ${ctx.editor_name}! Peningkatan ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} dalam 6 bulan menunjukkan komitmen Anda. Terus maju! 🚀`
  } else if (level === 'good') {
    message = `Solid performance, ${ctx.editor_name}! Anda di jalur yang baik. Fokus pada konsistensi dan feedback klien untuk naik ke level berikutnya. 👍`
  } else if (trend === 'improving') {
    message = `Kabar baik, ${ctx.editor_name}! Tren Anda membaik. Terus fokus pada improvement area dan momentum ini akan membawa hasil positif. 💡`
  } else {
    message = `${ctx.editor_name}, ini waktu untuk action. Review feedback klien, diskusi dengan manager, dan buat rencana konkret untuk improvement. Anda pasti bisa! 🔥`
  }

  const summary =
    level === 'excellent'
      ? `Performa cemerlang dengan KPI ${kpi.toFixed(1)}/5.0 dan rating klien ${rating.toFixed(1)}/5.0. ${trend === 'improving' ? 'Tren meningkat.' : trend === 'declining' ? 'Perlu jaga konsistensi.' : 'Stabil di level tinggi.'}`
      : level === 'good'
        ? `Performa baik dengan KPI ${kpi.toFixed(1)}/5.0. ${trend === 'improving' ? 'Tren positif, terus tingkatkan!' : trend === 'declining' ? 'Tren menurun, perlu perhatian.' : 'Stabil, ada ruang untuk improvement.'}`
        : `KPI ${kpi.toFixed(1)}/5.0 perlu peningkatan segera. ${trend === 'improving' ? 'Kabar baik: tren membaik.' : 'Butuh action plan konkret dengan manager.'}`

  return {
    summary,
    performance_level: level,
    trend,
    key_strengths: strengths.length > 0 ? strengths : ['Terus kembangkan keahlian teknis dan komunikasi Anda'],
    areas_for_improvement: improvements.length > 0 ? improvements : ['Pertahankan performa saat ini'],
    actionable_tips: tips,
    motivational_message: message,
  }
}

kpiRouter.post(
  '/my-insight',
  authenticate,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const viewer = req.user!
    const editor = await prisma.editor.findUnique({
      where: { user_id: viewer.sub },
      select: { editor_id: true },
    })
    if (!editor) {
      res.json(
        ok<EditorInsightResponse>({
          source: 'heuristic',
          insight: {
            summary: 'Belum ada data performa.',
            performance_level: 'needs_improvement',
            trend: 'stable',
            key_strengths: [],
            areas_for_improvement: [],
            actionable_tips: ['Selesaikan proyek pertama untuk mulai tracking performa'],
            motivational_message: 'Selamat bergabung! Fokus pada kualitas di proyek pertama Anda. 🚀',
          },
          generated_at: new Date().toISOString(),
        }),
      )
      return
    }

    const ctx = await buildEditorContext(editor.editor_id)
    if (!ctx || ctx.total_projects === 0) {
      res.json(
        ok<EditorInsightResponse>({
          source: 'heuristic',
          insight: {
            summary: 'Belum ada data proyek.',
            performance_level: 'needs_improvement',
            trend: 'stable',
            key_strengths: [],
            areas_for_improvement: [],
            actionable_tips: ['Selesaikan proyek pertama untuk mulai tracking performa'],
            motivational_message: 'Mulai dengan proyek pertama! Setiap expert pernah jadi pemula. 💪',
          },
          generated_at: new Date().toISOString(),
        }),
      )
      return
    }

    // Heuristic fallback jika OpenAI tidak tersedia
    if (!isOpenAiConfigured()) {
      res.json(
        ok<EditorInsightResponse>({
          source: 'heuristic',
          insight: heuristicEditorInsight(ctx),
          generated_at: new Date().toISOString(),
        }),
      )
      return
    }

    try {
      const client = getOpenAi()
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3, // Slightly creative for motivational tone
        top_p: 1,
        messages: [
          {
            role: 'system',
            content: [
              'Anda adalah performance coach berpengalaman untuk profesional jasa visual (editor foto, video, color grading) di Indonesia.',
              'Tugas: menganalisis data performa personal staf dan memberikan insight MOTIVASIONAL + ACTIONABLE.',
              '',
              'KELUARAN WAJIB berupa JSON valid dengan schema TEPAT:',
              '{',
              '  "summary": string (2-3 kalimat ringkasan performa, sebutkan angka KPI dan rating klien)',
              '  "performance_level": "excellent" | "good" | "needs_improvement",',
              '  "trend": "improving" | "stable" | "declining",',
              '  "key_strengths": string[] (2-4 kekuatan spesifik berdasarkan data, bukan generik)',
              '  "areas_for_improvement": string[] (1-3 area konkret yang perlu diperbaiki)',
              '  "actionable_tips": string[] (3-5 tips spesifik dan langsung bisa dilakukan, bukan saran umum)',
              '  "motivational_message": string (2-3 kalimat motivasi personal, sebutkan nama staf, tone supportive tapi jujur)',
              '}',
              '',
              'ATURAN PENTING:',
              '- HARUS menyebut angka konkret dari data (KPI, rating, jumlah proyek)',
              '- Tips harus ACTIONABLE (bisa langsung dilakukan), bukan generik ("tingkatkan komunikasi" → "Kirim update progress ke klien setiap 2 hari")',
              '- Tone: Supportive tapi jujur. Jika performa menurun, akui tapi tetap motivational.',
              '- Bahasa Indonesia natural-formal. Gunakan emoji 1-2x di motivational_message untuk warmth.',
              '- Jangan pernah bandingkan dengan staf lain (data privacy).',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `Analisis performa staf berikut dan berikan insight personal:`,
              '',
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
      const parsed = JSON.parse(raw) as Partial<EditorInsight>

      // Validate & fallback ke heuristic jika OpenAI output tidak lengkap
      if (
        !parsed.summary ||
        !parsed.performance_level ||
        !parsed.trend ||
        !Array.isArray(parsed.actionable_tips)
      ) {
        console.warn('[kpi/my-insight] OpenAI returned incomplete data, fallback to heuristic')
        res.json(
          ok<EditorInsightResponse>({
            source: 'heuristic',
            insight: heuristicEditorInsight(ctx),
            generated_at: new Date().toISOString(),
          }),
        )
        return
      }

      res.json(
        ok<EditorInsightResponse>({
          source: 'openai',
          insight: {
            summary: String(parsed.summary).trim(),
            performance_level: parsed.performance_level,
            trend: parsed.trend,
            key_strengths: Array.isArray(parsed.key_strengths) ? parsed.key_strengths.map(String) : [],
            areas_for_improvement: Array.isArray(parsed.areas_for_improvement)
              ? parsed.areas_for_improvement.map(String)
              : [],
            actionable_tips: parsed.actionable_tips.map(String),
            motivational_message: String(parsed.motivational_message ?? '').trim(),
          },
          generated_at: new Date().toISOString(),
        }),
      )
    } catch (err) {
      console.error('[kpi/my-insight] OpenAI failed, fallback to heuristic:', err)
      res.json(
        ok<EditorInsightResponse>({
          source: 'heuristic',
          insight: heuristicEditorInsight(ctx),
          generated_at: new Date().toISOString(),
        }),
      )
    }
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
        ? `Perketat kepatuhan presensi ${c.department}: kirim briefing kedisiplinan mingguan dan minta manajer mereview jam kerja 3 staf yang paling sering terlambat.`
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

const recommendationSchema = z.object({ department: z.string().trim().min(1).optional() })

kpiRouter.post(
  '/recommendation',
  authenticate,
  requireRole('hr_admin', 'superadmin', 'admin_manager'),
  validateBody(recommendationSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof recommendationSchema>
    let ctx = await buildDeptContexts()

    if (req.user!.role === 'admin_manager') {
      // Scope is enforced server-side from the manager's own record — never
      // trust a client-supplied department for this role.
      const manager = await prisma.adminManager.findFirst({
        where: { user_id: req.user!.sub },
        include: { departments: { select: { name: true } } },
      })
      const myDept = manager?.departments[0]?.name
      ctx = ctx.filter(c => c.department === myDept)
    } else if (body.department) {
      ctx = ctx.filter(c => c.department === body.department)
    }

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
