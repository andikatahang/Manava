import { randomBytes } from 'node:crypto'
import type { JobApplication } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { HttpError } from '../../middleware/errorHandler.js'

// ─── Mock AI summary ─────────────────────────────────────────────────────────
// Deterministic template standing in for a real LLM call. Produces a short
// 3–4 sentence profile plus the extracted key skills (the form's skill list).

export interface SummaryInput {
  full_name: string
  age: number
  education: string
  gpa: number
  graduation_year: number
  skills: string[]
}

export function generateAiSummary(input: SummaryInput): string {
  const yearsSinceGrad = Math.max(0, new Date().getFullYear() - input.graduation_year)
  const experience =
    yearsSinceGrad === 0
      ? 'baru lulus (fresh graduate)'
      : `sekitar ${yearsSinceGrad} tahun sejak kelulusan`
  const gpaNote =
    input.gpa >= 3.5 ? 'IPK di atas rata-rata' : input.gpa >= 3.0 ? 'IPK cukup baik' : 'IPK di bawah rata-rata'
  const primarySkills = input.skills.slice(0, 3).join(', ')

  return [
    `${input.full_name} (${input.age} tahun) adalah lulusan ${input.education} tahun ${input.graduation_year} dengan ${gpaNote} (${input.gpa.toFixed(2)}).`,
    `Kandidat memiliki pengalaman ${experience} dan menonjol pada keahlian ${primarySkills}.`,
    `Profil keahliannya paling cocok untuk departemen ${deriveDepartment(input.skills)}.`,
    `Rekomendasi: lanjutkan ke tahap interview untuk memvalidasi portofolio dan kecocokan tim.`,
  ].join(' ')
}

// Map form skills to the closest existing department. Mirrors the frontend's
// departmentMatch heuristic so both sides agree.
export function deriveDepartment(skills: string[]): string {
  const has = (...names: string[]) => names.some(n => skills.includes(n))
  if (has('Video Edit', 'Motion Graphics', 'VFX')) return 'Video Editing'
  if (has('Color Grading', 'Color Correction')) return 'Color Grading'
  return 'Photo Retouching'
}

// ─── Interview invitation email (template-based, mock transport) ────────────

export interface InterviewDetails {
  interviewer: string
  mode: 'online' | 'offline'
  location?: string
}

export function renderInterviewEmail(app: JobApplication, details: InterviewDetails): string {
  const format =
    details.mode === 'online'
      ? 'online (Google Meet) — tautan menyusul via email ini'
      : `offline — ${details.location}`
  return [
    `Kepada ${app.full_name},`,
    '',
    'Terima kasih telah melamar sebagai Editor di Manava. Setelah meninjau lamaran Anda,',
    'kami ingin mengundang Anda ke tahap interview.',
    '',
    'Detail interview:',
    `  • Interviewer : ${details.interviewer}`,
    `  • Format      : ${format}`,
    '  • Jadwal      : akan dikonfirmasi oleh tim HR maksimal 2×24 jam',
    '  • Durasi      : ± 45 menit (wawancara + review portofolio)',
    '',
    'Mohon balas email ini untuk mengonfirmasi ketersediaan Anda.',
    '',
    'Salam,',
    'Tim HR Manava',
  ].join('\n')
}

// ─── Account creation on approval ────────────────────────────────────────────

export interface CreatedAccount {
  user_id: string
  username: string
  email: string
  temp_password: string
}

// Credentials email for the account auto-created on approval — this is the
// only channel that delivers the temporary password to the new editor.
export function renderCredentialsEmail(fullName: string, account: CreatedAccount, appUrl: string): string {
  return [
    `Kepada ${fullName},`,
    '',
    'Selamat! Anda diterima sebagai Editor di Manava. Akun Anda sudah dibuat:',
    '',
    `  • URL login    : ${appUrl}/login`,
    `  • Username     : ${account.username}`,
    `  • Password     : ${account.temp_password}`,
    '',
    'Segera login dan ganti password Anda melalui halaman Profil.',
    '',
    'Salam,',
    'Tim HR Manava',
  ].join('\n')
}

// Username rules match self-registration: lowercase, no spaces, only "-"/"_".
function slugifyUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24) || 'editor'
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base
  for (let i = 2; ; i++) {
    const taken = await prisma.user.findUnique({ where: { username: candidate } })
    if (!taken) return candidate
    candidate = `${base}${i}`
  }
}

// Create the employee account (User + Editor) from application data.
// Default role is editor; HR can adjust department/salary later.
export async function createEditorAccount(app: JobApplication): Promise<CreatedAccount> {
  const emailTaken = await prisma.user.findUnique({ where: { email: app.email } })
  if (emailTaken) {
    throw new HttpError(409, 'Email pelamar sudah terdaftar sebagai user — buat akun manual dari halaman Users')
  }

  const username = await uniqueUsername(slugifyUsername(app.full_name))
  const temp_password = randomBytes(6).toString('base64url') // ~8 chars, URL-safe
  const password_hash = await hashPassword(temp_password)

  const DEFAULT_BASE_SALARY = 7_000_000

  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({
      data: {
        full_name: app.full_name,
        email: app.email,
        username,
        password_hash,
        role: 'editor',
      },
    })
    await tx.editor.create({
      data: {
        user_id: created.user_id,
        full_name: app.full_name,
        email: app.email,
        department: deriveDepartment(app.skills),
        specialization: app.skills,
        base_salary: DEFAULT_BASE_SALARY,
        onboarded_at: new Date(),
      },
    })
    await tx.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'approved', decided_at: new Date(), created_user_id: created.user_id },
    })
    return created
  })

  return { user_id: user.user_id, username, email: app.email, temp_password }
}
