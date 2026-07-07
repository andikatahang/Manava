// Klasifikasi permintaan revisi klien: minor (gratis, memakai allowance) vs
// major (perubahan cakupan, berpotensi berbayar). Jalur utama gpt-4o-mini
// dengan jawaban JSON; fallback heuristik kata-kunci deterministik sehingga
// alur revisi tidak pernah bergantung pada ketersediaan OpenAI.
// Label 'uncertain' berarti sinyal tidak cukup — perlu tinjauan mediator.

import { getOpenAi, isOpenAiConfigured, OPENAI_MODEL } from '../../lib/openai.js'

export type RevisionLabel = 'minor' | 'major' | 'uncertain'

export interface RevisionClassification {
  label: RevisionLabel
  confidence: number // 0–1
  summary: string    // 1–2 kalimat Bahasa Indonesia, alasan kategorisasi
  source: 'openai' | 'heuristic'
}

export interface RevisionContext {
  project_title: string
  project_description: string
  included_scope?: string
  excluded_scope?: string
}

// ── Heuristik deterministik ──────────────────────────────────────────────────

// Sinyal MAJOR: perubahan konsep/cakupan, penambahan materi baru, buat ulang.
const MAJOR_PATTERNS: RegExp[] = [
  /ganti (konsep|tema|model|talent|lokasi|musik utama|semua)/,
  /(ubah|rombak) (total|keseluruhan|konsep|struktur)/,
  /buat (ulang|baru)/, /bikin (ulang|baru)/, /redesign|re-design|remake/,
  /konsep baru|arah baru|versi baru|alternatif baru/,
  /tambah (scene|adegan|foto|video|halaman|bahasa|versi|karakter|logo|segmen|durasi)/,
  /footage baru|materi baru|aset baru|file baru dari kami/,
  /perpanjang durasi|durasi (jadi|menjadi)/,
  /di luar (brief|scope|cakupan|kesepakatan)/,
  /(seluruh|semua) (foto|video|shot|halaman) diganti/,
  /scope|cakupan bertambah/,
]

// Sinyal MINOR: penyesuaian kecil pada hasil yang sudah ada.
const MINOR_PATTERNS: RegExp[] = [
  /warna|tone|kontras|saturasi|exposure|eksposur|brightness|kecerahan/,
  /rapikan|haluskan|perhalus|bersihkan|cleanup|noise/,
  /(kecilkan|besarkan|perbesar|perkecil|geser|pindahkan) (sedikit|posisi|teks|logo|elemen)?/,
  /typo|salah ketik|ejaan|penulisan/,
  /font|ukuran teks|teks kurang terbaca/,
  /crop|potong (sedikit|bagian|beberapa detik)/,
  /volume|audio (level|balance)|suara (kurang|terlalu)/,
  /transisi|timing|tempo|pacing/,
  /subtitle|takarir/,
  /sedikit|kurang (terang|gelap|tajam|halus)/,
  /revisi (kecil|minor|ringan)/,
]

function countHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, re) => (re.test(text) ? n + 1 : n), 0)
}

export function heuristicClassify(requestText: string): RevisionClassification {
  const lower = requestText.toLowerCase()
  const major = countHits(lower, MAJOR_PATTERNS)
  const minor = countHits(lower, MINOR_PATTERNS)
  // Permintaan sangat panjang cenderung berisi perubahan besar berlapis.
  const lengthLean = requestText.length > 500 ? 1 : 0
  const majorScore = major + lengthLean

  if (majorScore === 0 && minor === 0) {
    return {
      label: 'uncertain',
      confidence: 0.4,
      summary:
        'Deskripsi perubahan tidak mengandung sinyal yang cukup untuk dikategorikan otomatis — '
        + 'permintaan ini akan ditinjau manual sebelum diklasifikasikan minor atau major.',
      source: 'heuristic',
    }
  }

  const margin = Math.abs(majorScore - minor)
  const confidence = Math.min(0.9, 0.6 + margin * 0.1)
  if (majorScore > minor) {
    return {
      label: 'major',
      confidence,
      summary:
        'Permintaan mengindikasikan perubahan cakupan (konsep/materi baru atau pengerjaan ulang), '
        + 'sehingga dikategorikan MAJOR — di luar allowance revisi dan dapat dikenakan biaya tambahan.',
      source: 'heuristic',
    }
  }
  return {
    label: 'minor',
    confidence,
    summary:
      'Permintaan berupa penyesuaian kecil atas hasil yang sudah ada (mis. warna, kerapian, teks, timing), '
      + 'sehingga dikategorikan MINOR dan memakai jatah revisi gratis proyek ini.',
    source: 'heuristic',
  }
}

// ── Jalur OpenAI ─────────────────────────────────────────────────────────────

async function openAiClassify(
  requestText: string,
  ctx: RevisionContext,
): Promise<RevisionClassification> {
  const completion = await getOpenAi().chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'Anda mesin klasifikasi revisi untuk studio jasa visual (retouching foto, video editing, '
          + 'color grading, motion graphics, VFX). Tentukan apakah permintaan revisi klien bersifat '
          + '"minor" (penyesuaian kecil pada hasil yang sudah ada: warna, kerapian, teks, timing, audio) '
          + 'atau "major" (perubahan konsep/cakupan, materi atau scene baru, pengerjaan ulang, deliverable tambahan). '
          + 'Gunakan "uncertain" hanya bila benar-benar ambigu. '
          + 'Balas HANYA JSON: {"label": "minor"|"major"|"uncertain", "confidence": number 0-1, '
          + '"summary": string}. "summary": 1-2 kalimat Bahasa Indonesia yang menjelaskan alasan kategorisasi '
          + 'kepada klien dan editor.',
      },
      {
        role: 'user',
        content:
          `Proyek: ${ctx.project_title}\nDeskripsi proyek: ${ctx.project_description}\n`
          + (ctx.included_scope ? `Termasuk dalam scope: ${ctx.included_scope}\n` : '')
          + (ctx.excluded_scope ? `Di luar scope: ${ctx.excluded_scope}\n` : '')
          + `\nPermintaan revisi klien:\n${requestText}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty completion')
  const parsed = JSON.parse(raw) as Record<string, unknown>

  const label = parsed.label
  if (label !== 'minor' && label !== 'major' && label !== 'uncertain') {
    throw new Error(`Unexpected label: ${String(label)}`)
  }
  const confidence = typeof parsed.confidence === 'number'
    ? Math.min(1, Math.max(0, parsed.confidence))
    : 0.6
  const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
    ? parsed.summary.trim()
    : 'Klasifikasi otomatis berdasarkan perbandingan permintaan terhadap scope proyek.'

  return { label, confidence, summary, source: 'openai' }
}

// ── Orkestrator ──────────────────────────────────────────────────────────────

export async function classifyRevision(
  requestText: string,
  ctx: RevisionContext,
): Promise<RevisionClassification> {
  if (isOpenAiConfigured()) {
    try {
      return await openAiClassify(requestText, ctx)
    } catch (err) {
      console.error('[projects/classifier] OpenAI failed — falling back to heuristic:',
        err instanceof Error ? err.message : err)
    }
  }
  return heuristicClassify(requestText)
}
