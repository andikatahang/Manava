import type { JobApplication } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { HttpError } from '../../middleware/errorHandler.js'

// Candidate insight generation moved to ./screening.ts (July 2026): the AI now
// extracts the profile from the CV itself and evaluates the vacancy criteria.

// Single-row switch (id "default") — HR toggles whether /apply accepts new
// submissions. Missing row defaults to open (matches the schema default).
export async function getRecruitmentSetting() {
  return prisma.recruitmentSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
}

// Map skills to the closest existing department, used both when storing the
// screening result and as fallback at account creation.
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
    'Terima kasih telah melamar sebagai Staf di Manava. Setelah meninjau lamaran Anda,',
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

// Rejection email — sent for both screening (New) and post-interview
// rejections so the candidate is never left waiting without word.
export function renderRejectionEmail(app: JobApplication): string {
  return [
    `Kepada ${app.full_name},`,
    '',
    'Terima kasih atas waktu dan minat Anda melamar sebagai Staf di Manava.',
    '',
    'Setelah peninjauan yang cermat, dengan berat hati kami sampaikan bahwa kami',
    'belum dapat melanjutkan lamaran Anda ke tahap berikutnya untuk lowongan ini.',
    '',
    'Keputusan ini bukan penilaian akhir atas kemampuan Anda — kebutuhan kami saat',
    'ini sangat spesifik. Kami menyimpan data lamaran Anda dan mengundang Anda',
    'untuk melamar kembali saat lowongan baru dibuka.',
    '',
    'Semoga sukses dalam perjalanan karier Anda.',
    '',
    'Salam,',
    'Tim HR Manava',
  ].join('\n')
}

// ─── Account creation on approval ────────────────────────────────────────────

// Demo requirement: every approved editor starts with this shared password;
// password_is_default=true makes the app nag them to change it after login.
const DEFAULT_EDITOR_PASSWORD = 'manava123'

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
    'Selamat! Anda diterima sebagai Staf di Manava. Akun Anda sudah dibuat:',
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

// Username = form name lowercased and concatenated, skipping abbreviations:
// "M. Andika Tahang" → "andikatahang". A token counts as an abbreviation when
// it contains a "." or is a single letter (initials).
export function slugifyUsername(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(w => !w.includes('.') && w.replace(/[^a-zA-Z0-9]/g, '').length > 1)
  return words
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
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
// Default role is editor. `departmentName` is HR's choice from the placement
// popup; without it the AI recommendation from the CV screening is used.
export async function createEditorAccount(
  app: JobApplication,
  departmentName?: string,
): Promise<CreatedAccount> {
  const emailTaken = await prisma.user.findUnique({ where: { email: app.email } })
  if (emailTaken) {
    throw new HttpError(409, 'Email pelamar sudah terdaftar sebagai user — buat akun manual dari halaman Users')
  }

  const username = await uniqueUsername(slugifyUsername(app.full_name))
  // Shared default password (demo requirement) — the account is flagged so the
  // app keeps suggesting a password update after login until they change it.
  const temp_password = DEFAULT_EDITOR_PASSWORD
  const password_hash = await hashPassword(temp_password)

  const DEFAULT_BASE_SALARY = 7_000_000
  const department = departmentName?.trim()
    || app.ai_department
    || deriveDepartment(app.skills)

  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({
      data: {
        full_name: app.full_name,
        email: app.email,
        username,
        password_hash,
        password_is_default: true,
        role: 'editor',
      },
    })
    const editor = await tx.editor.create({
      data: {
        user_id: created.user_id,
        full_name: app.full_name,
        email: app.email,
        department,
        specialization: app.skills,
        base_salary: DEFAULT_BASE_SALARY,
        onboarded_at: new Date(),
      },
    })
    // Place the new editor into the actual department roster when one with
    // that name exists — a brand-new editor has no other membership, so the
    // one-editor-one-department rule always holds here.
    const dept = await tx.department.findFirst({ where: { name: department } })
    if (dept) {
      await tx.departmentMember.create({
        data: { department_id: dept.id, editor_id: editor.editor_id },
      })
    }
    await tx.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'approved', decided_at: new Date(), created_user_id: created.user_id },
    })
    return created
  })

  return { user_id: user.user_id, username, email: app.email, temp_password }
}
