// Rekonsiliasi satu kali: selaraskan EditorMetrics, Editor.rating, dan
// KpiSnapshot dengan data Review nyata. Diperlukan karena nilai seed
// (mis. rating 4.1) tidak pernah dihitung ulang saat review nyata masuk,
// sehingga Dashboard, halaman Indeks, dan data review saling bertentangan.
//
// Aturan:
// - Staf DENGAN review: metrics.avg_client_rating & editor.rating = rata-rata
//   seluruh review; kpi_average dihitung ulang dengan formula standar.
//   Snapshot bulan yang punya review ikut dikoreksi ke rata-rata bulan itu.
// - Staf dengan proyek yang sudah berakhir: completion_rate = selesai ÷
//   (selesai + batal) × 100 dari proyek nyata.
// - Staf tanpa review DAN tanpa proyek berakhir: tidak disentuh
//   (riwayat seed tetap untuk demo).
//
// Jalankan: npx tsx scripts/reconcile-kpi.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const round2 = (n: number) => Math.round(n * 100) / 100
const bandOf = (kpi: number) => (kpi >= 4.5 ? 'excellent' : kpi >= 3.5 ? 'good' : 'needs_improvement') as const

async function main() {
  const editors = await prisma.editor.findMany({ include: { metrics: true } })
  let fixedEditors = 0
  let fixedSnapshots = 0

  for (const editor of editors) {
    const [reviews, completedCount, cancelledCount] = await Promise.all([
      prisma.review.findMany({
        where: { project: { editor_id: editor.editor_id } },
        select: { rating: true, created_at: true },
      }),
      prisma.project.count({ where: { editor_id: editor.editor_id, status: 'completed' } }),
      prisma.project.count({ where: { editor_id: editor.editor_id, status: 'cancelled' } }),
    ])
    const concluded = completedCount + cancelledCount
    if (reviews.length === 0 && concluded === 0) continue

    const avgClientRating =
      reviews.length > 0
        ? round2(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
        : round2(editor.metrics?.avg_client_rating ?? editor.rating)
    const completionRate =
      concluded > 0
        ? Math.round((completedCount / concluded) * 100)
        : (editor.metrics?.completion_rate ?? editor.completion_rate)
    const managerRating = editor.metrics?.manager_rating ?? 3
    const kpiAverage = round2((avgClientRating + (completionRate / 100) * 5 + managerRating) / 3)
    const band = bandOf(kpiAverage)

    await prisma.$transaction([
      prisma.editorMetrics.upsert({
        where: { editor_id: editor.editor_id },
        update: {
          avg_client_rating: avgClientRating,
          completion_rate: completionRate,
          kpi_average: kpiAverage,
          performance_band: band,
        },
        create: {
          editor_id: editor.editor_id,
          editor_name: editor.full_name,
          avg_client_rating: avgClientRating,
          completion_rate: completionRate,
          manager_rating: managerRating,
          kpi_average: kpiAverage,
          performance_band: band,
        },
      }),
      prisma.editor.update({
        where: { editor_id: editor.editor_id },
        data: { rating: avgClientRating, completion_rate: completionRate, performance_band: band },
      }),
    ])
    fixedEditors += 1
    console.log(
      `${editor.full_name} (${editor.editor_id}): rating ${avgClientRating}, completion ${completionRate}% ` +
        `(${completedCount}/${concluded} proyek), KPI ${kpiAverage} (${reviews.length} review)`,
    )

    // Koreksi snapshot untuk bulan-bulan yang benar-benar punya review.
    const byMonth = new Map<string, { sum: number; n: number }>()
    for (const r of reviews) {
      const period = r.created_at.toISOString().slice(0, 7)
      const cur = byMonth.get(period) ?? { sum: 0, n: 0 }
      cur.sum += r.rating
      cur.n += 1
      byMonth.set(period, cur)
    }
    for (const [period, v] of byMonth) {
      const snap = await prisma.kpiSnapshot.findUnique({
        where: { editor_id_period: { editor_id: editor.editor_id, period } },
      })
      const monthRating = round2(v.sum / v.n)
      const snapCompletion = snap?.completion_rate ?? completionRate
      const snapManager = snap?.manager_rating ?? managerRating
      const monthKpi = round2((monthRating + (snapCompletion / 100) * 5 + snapManager) / 3)
      await prisma.kpiSnapshot.upsert({
        where: { editor_id_period: { editor_id: editor.editor_id, period } },
        update: { avg_client_rating: monthRating, kpi_average: monthKpi },
        create: {
          editor_id: editor.editor_id,
          department: editor.department,
          period,
          avg_client_rating: monthRating,
          completion_rate: snapCompletion,
          manager_rating: snapManager,
          kpi_average: monthKpi,
        },
      })
      fixedSnapshots += 1
      console.log(`  snapshot ${period}: rating ${monthRating}, KPI ${monthKpi}`)
    }
  }

  console.log(`Selesai: ${fixedEditors} staf direkonsiliasi, ${fixedSnapshots} snapshot dikoreksi.`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
