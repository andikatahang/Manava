// CV screening: extract the candidate profile (age, education, GPA, skills)
// from the uploaded CV and evaluate it against the vacancy criteria.
// Primary path uses gpt-4o-mini on the extracted CV text; the fallback is a
// deterministic keyword/regex heuristic so screening never blocks submission.
// The pass/fail verdict is ALWAYS computed server-side from the extracted
// profile (evaluateCriteria) — the model only extracts and summarizes.

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { getOpenAi, isOpenAiConfigured, OPENAI_MODEL } from '../../lib/openai.js'

// ── Vacancy criteria (single source of truth, exposed via GET /criteria) ────

export const SKILL_OPTIONS = [
  'Product Retouch', 'Color Correction', 'Portrait Retouch', 'BG Removal',
  'Video Edit', 'Color Grading', 'Motion Graphics', 'VFX',
] as const

export const EDUCATION_LEVELS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'] as const
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]

export const VACANCY_CRITERIA = {
  min_age: 18,
  max_age: 35,
  min_education: 'D3' as EducationLevel,
  min_gpa: 3.0,
  skills: SKILL_OPTIONS as readonly string[],
} as const

export function defaultCriteria(): JobCriteria {
  return {
    min_age: 18,
    max_age: 35,
    min_education: 'D3',
    min_gpa: 3.0,
    skills: [...SKILL_OPTIONS],
  }
}

export const CRITERIA_DESCRIPTION = [
  { label: 'Umur', value: `${18}–${35} tahun` },
  { label: 'Pendidikan', value: 'Minimal D3' },
  { label: 'IPK', value: 'Minimal 3.00' },
  { label: 'Keahlian', value: `Minimal satu dari: ${SKILL_OPTIONS.join(', ')}` },
] as const

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedProfile {
  age: number | null
  education: EducationLevel | null
  gpa: number | null
  graduation_year: number | null
  skills: string[]
}

export interface CriterionCheck {
  label: string
  requirement: string
  found: string
  status: 'pass' | 'fail' | 'unknown'
}

export interface ScreeningResult {
  profile: ExtractedProfile
  summary: string
  checks: CriterionCheck[]
  // true = memenuhi, false = tidak memenuhi, null = data kurang → tinjau manual
  meets_criteria: boolean | null
  source: 'openai' | 'heuristic'
}

// ── CV text extraction ───────────────────────────────────────────────────────

const MAX_CV_TEXT_CHARS = 12_000

export async function extractCvText(cvData: string): Promise<string | null> {
  const mime = cvData.slice(5, cvData.indexOf(';'))
  const buffer = Buffer.from(cvData.slice(cvData.indexOf(',') + 1), 'base64')
  try {
    if (mime === 'application/pdf') {
      const parser = new PDFParse({ data: buffer })
      try {
        const parsed = await parser.getText()
        return normalizeText(parsed.text)
      } finally {
        await parser.destroy()
      }
    }
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const parsed = await mammoth.extractRawText({ buffer })
      return normalizeText(parsed.value)
    }
    // Legacy .doc has no reliable extractor here — screening degrades to
    // "needs manual review" instead of blocking the application.
    return null
  } catch (err) {
    console.error('[screening] CV text extraction failed:',
      err instanceof Error ? err.message : err)
    return null
  }
}

function normalizeText(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  return text.length >= 30 ? text.slice(0, MAX_CV_TEXT_CHARS) : null
}

export interface JobCriteria {
  min_age: number
  max_age: number
  min_education: string
  min_gpa: number
  skills: string[]
}

// ── Criteria evaluation (deterministic, shared by both sources) ──────────────

export function evaluateCriteria(profile: ExtractedProfile, criteria: JobCriteria): {
  checks: CriterionCheck[]
  meets_criteria: boolean | null
} {
  const c = criteria
  const eduRank = (e: string) => EDUCATION_LEVELS.indexOf(e as EducationLevel)

  const checks: CriterionCheck[] = [
    {
      label: 'Umur',
      requirement: `${c.min_age}–${c.max_age} tahun`,
      found: profile.age != null ? `${profile.age} tahun` : 'tidak terdeteksi di CV',
      status: profile.age == null ? 'unknown'
        : profile.age >= c.min_age && profile.age <= c.max_age ? 'pass' : 'fail',
    },
    {
      label: 'Pendidikan',
      requirement: `Minimal ${c.min_education}`,
      found: profile.education ?? 'tidak terdeteksi di CV',
      status: profile.education == null ? 'unknown'
        : eduRank(profile.education) >= eduRank(c.min_education) ? 'pass' : 'fail',
    },
    {
      label: 'IPK',
      requirement: `Minimal ${c.min_gpa.toFixed(2)}`,
      found: profile.gpa != null ? profile.gpa.toFixed(2) : 'tidak terdeteksi di CV',
      status: profile.gpa == null ? 'unknown'
        : profile.gpa >= c.min_gpa ? 'pass' : 'fail',
    },
    {
      label: 'Keahlian',
      requirement: 'Minimal satu keahlian relevan',
      found: profile.skills.length ? profile.skills.join(', ') : 'tidak terdeteksi di CV',
      status: profile.skills.length > 0 ? 'pass' : 'unknown',
    },
  ]

  const meets_criteria = checks.some(ch => ch.status === 'fail') ? false
    : checks.every(ch => ch.status === 'pass') ? true
    : null
  return { checks, meets_criteria }
}

function verdictSentence(meets: boolean | null): string {
  if (meets === true) return 'Berdasarkan analisis CV, kandidat MEMENUHI kriteria lowongan ini.'
  if (meets === false) return 'Berdasarkan analisis CV, kandidat BELUM memenuhi kriteria lowongan ini.'
  return 'Sebagian data tidak terbaca dari CV — kelayakan kandidat perlu ditinjau manual oleh HR.'
}

// ── Heuristic extraction (fallback, no OpenAI) ───────────────────────────────

// Loose synonyms → canonical skill names, checked against the CV text.
const SKILL_SYNONYMS: Record<string, string[]> = {
  'Product Retouch': ['product retouch', 'retouch produk'],
  'Color Correction': ['color correction', 'koreksi warna'],
  'Portrait Retouch': ['portrait retouch', 'retouch', 'retouching'],
  'BG Removal': ['bg removal', 'background removal', 'hapus background', 'clipping path'],
  'Video Edit': ['video edit', 'video editing', 'editor video', 'premiere', 'final cut', 'capcut', 'davinci'],
  'Color Grading': ['color grading', 'grading warna'],
  'Motion Graphics': ['motion graphic', 'after effects'],
  'VFX': ['vfx', 'visual effect', 'compositing'],
}

export function heuristicExtract(text: string): ExtractedProfile {
  const lower = text.toLowerCase()
  const nowYear = new Date().getFullYear()

  const gpaMatch = text.match(/(?:IPK|GPA)\s*[:\s]*([0-4](?:[.,]\d{1,2})?)/i)
  const gpa = gpaMatch ? Number(gpaMatch[1]!.replace(',', '.')) : null

  let education: EducationLevel | null = null
  if (/\bS-?3\b|doktor|ph\.?d/i.test(text)) education = 'S3'
  else if (/\bS-?2\b|magister|master(?:'s)? degree/i.test(text)) education = 'S2'
  else if (/\bS-?1\b|sarjana|bachelor/i.test(text)) education = 'S1'
  else if (/\bD-?4\b|diploma 4|sarjana terapan/i.test(text)) education = 'D4'
  else if (/\bD-?3\b|diploma 3|diploma/i.test(text)) education = 'D3'
  else if (/\bSMK\b|\bSMA\b/i.test(text)) education = 'SMA/SMK'

  const gradMatch = text.match(/(?:lulus|graduat\w+|angkatan)[^\d]{0,20}((?:19|20)\d{2})/i)
  const graduation_year = gradMatch ? Number(gradMatch[1]) : null

  let age: number | null = null
  const ageMatch = text.match(/(?:usia|umur|age)\s*[:\s]*(\d{2})\b/i)
  if (ageMatch) age = Number(ageMatch[1])
  else {
    const birthMatch = text.match(/(?:lahir|born)[^\d]{0,40}((?:19|20)\d{2})/i)
    if (birthMatch) age = nowYear - Number(birthMatch[1])
  }
  if (age != null && (age < 15 || age > 80)) age = null

  const skills = Object.entries(SKILL_SYNONYMS)
    .filter(([, needles]) => needles.some(n => lower.includes(n)))
    .map(([canonical]) => canonical)

  return { age, education, gpa, graduation_year, skills }
}

function heuristicSummary(profile: ExtractedProfile, meets: boolean | null): string {
  const parts: string[] = []
  const facts: string[] = []
  if (profile.age != null) facts.push(`usia ${profile.age} tahun`)
  if (profile.education) facts.push(`pendidikan ${profile.education}`)
  if (profile.gpa != null) facts.push(`IPK ${profile.gpa.toFixed(2)}`)
  if (profile.graduation_year) facts.push(`lulus ${profile.graduation_year}`)
  parts.push(facts.length
    ? `Dari CV terdeteksi ${facts.join(', ')}.`
    : 'Data profil (umur, pendidikan, IPK) tidak terdeteksi otomatis dari CV.')
  parts.push(profile.skills.length
    ? `Keahlian relevan yang ditemukan: ${profile.skills.join(', ')}.`
    : 'Tidak ditemukan keahlian relevan yang cocok dengan kebutuhan lowongan.')
  parts.push(verdictSentence(meets))
  return parts.join(' ')
}

// ── OpenAI extraction ────────────────────────────────────────────────────────

async function openAiExtract(cvText: string): Promise<{ profile: ExtractedProfile; summary: string }> {
  const completion = await getOpenAi().chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content:
          'Anda adalah asisten screening HR untuk studio jasa visual. Anda menerima teks CV kandidat. ' +
          'Balas HANYA JSON dengan bentuk {"age": number|null, "education": string|null, "gpa": number|null, ' +
          '"graduation_year": number|null, "skills": string[], "summary": string}. ' +
          `"education": tepat salah satu dari ${JSON.stringify(EDUCATION_LEVELS)} atau null bila tidak disebut. ` +
          `"skills": subset dari ${JSON.stringify(SKILL_OPTIONS)} yang benar-benar didukung isi CV (boleh kosong). ` +
          '"gpa": skala 4.0. Gunakan null untuk data yang TIDAK tertulis di CV — jangan menebak. ' +
          '"summary": 2-3 kalimat Bahasa Indonesia yang faktual tentang latar belakang & keahlian kandidat.',
      },
      { role: 'user', content: cvText },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty completion')
  const p = JSON.parse(raw) as Record<string, unknown>

  const num = (v: unknown, min: number, max: number): number | null =>
    typeof v === 'number' && v >= min && v <= max ? v : null
  const education = typeof p.education === 'string'
    && (EDUCATION_LEVELS as readonly string[]).includes(p.education)
    ? (p.education as EducationLevel) : null
  const skills = Array.isArray(p.skills)
    ? p.skills.filter((s): s is string =>
        typeof s === 'string' && (SKILL_OPTIONS as readonly string[]).includes(s))
    : []
  const summary = typeof p.summary === 'string' ? p.summary.trim() : ''
  if (!summary) throw new Error('Malformed screening payload')

  return {
    profile: {
      age: num(p.age, 15, 80),
      education,
      gpa: num(p.gpa, 0, 4),
      graduation_year: num(p.graduation_year, 1980, new Date().getFullYear()),
      skills,
    },
    summary,
  }
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export async function screenCv(cvData: string, criteria?: JobCriteria): Promise<ScreeningResult> {
  const jobCriteria = criteria ?? defaultCriteria()
  const text = await extractCvText(cvData)
  if (!text) {
    const profile: ExtractedProfile = {
      age: null, education: null, gpa: null, graduation_year: null, skills: [],
    }
    const { checks } = evaluateCriteria(profile, jobCriteria)
    return {
      profile,
      summary:
        'Teks CV tidak dapat dibaca otomatis (file terlindungi, hasil scan gambar, atau format .doc lama). '
        + verdictSentence(null),
      checks,
      meets_criteria: null,
      source: 'heuristic',
    }
  }

  if (isOpenAiConfigured()) {
    try {
      const { profile, summary } = await openAiExtract(text)
      const { checks, meets_criteria } = evaluateCriteria(profile, jobCriteria)
      return {
        profile,
        summary: `${summary} ${verdictSentence(meets_criteria)}`,
        checks,
        meets_criteria,
        source: 'openai',
      }
    } catch (err) {
      console.error('[screening] OpenAI extraction failed — falling back to heuristic:',
        err instanceof Error ? err.message : err)
    }
  }

  const profile = heuristicExtract(text)
  const { checks, meets_criteria } = evaluateCriteria(profile, jobCriteria)
  return {
    profile,
    summary: heuristicSummary(profile, meets_criteria),
    checks,
    meets_criteria,
    source: 'heuristic',
  }
}
