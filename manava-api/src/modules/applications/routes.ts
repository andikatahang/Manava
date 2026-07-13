import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import { publicApplyLimiter } from '../../lib/rateLimit.js'
import { sendEmailBounded } from '../../lib/mailer.js'
import { env } from '../../config/env.js'
import {
  createEditorAccount,
  deriveDepartment,
  getRecruitmentSetting,
  renderCredentialsEmail,
  renderInterviewEmail,
  renderRejectionEmail,
} from './service.js'
import { CRITERIA_DESCRIPTION, screenCv } from './screening.js'

export const applicationsRouter = Router()

// ~5MB file → ~6.8M base64 chars; cap a bit above that.
const MAX_CV_DATA_LENGTH = 7_500_000
const CV_DATA_URL_RE =
  /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/]+=*$/

// Applicants only type name/email/phone — the profile (age, education, GPA,
 // skills) is AI-extracted from the CV server-side at submission time.
 const submitSchema = z.object({
   full_name: z.string().trim().min(2).max(100),
   email: z.string().trim().email(),
   phone: z.string().trim().min(6).max(30),
   cv_name: z.string().trim().min(1).max(200),
   cv_data: z.string().max(MAX_CV_DATA_LENGTH).regex(CV_DATA_URL_RE, 'CV harus PDF/DOC dalam format data URL'),
   job_id: z.string().optional(), // link to job posting
 })

// Public list/detail fields — cv_data is excluded (streamed via /:id/cv).
const LIST_SELECT = {
  application_id: true,
  job_id: true,
  job: { select: { job_id: true, title: true, department: true, position: true, work_type: true, work_system: true } },
  full_name: true,
  email: true,
  age: true,
  phone: true,
  education: true,
  gpa: true,
  graduation_year: true,
  skills: true,
  cv_name: true,
  cv_mime: true,
  ai_summary: true,
  ai_source: true,
  ai_confidence: true,
  ai_department: true,
  ai_meets_criteria: true,
  status: true,
  invited_at: true,
  interview_email: true,
  decided_at: true,
  created_user_id: true,
  submitted_at: true,
} as const

const HR_ROLES = ['hr_admin', 'superadmin'] as const

// ── 0. Public vacancy criteria ───────────────────────────────────────────────

// Criteria shown on the /apply form — same values the screening evaluates
// server-side at submission (the form itself shows no AI result). With
// ?job_id= the criteria come from that job posting instead of the defaults.
applicationsRouter.get(
  '/criteria',
  asyncHandler(async (req, res) => {
    const jobId = typeof req.query.job_id === 'string' ? req.query.job_id : undefined
    if (!jobId) return res.json(ok(CRITERIA_DESCRIPTION))

    const job = await prisma.jobPosting.findUnique({
      where: { job_id: jobId },
      select: { min_education: true, min_gpa: true, required_skills: true, required_experience: true },
    })
    if (!job) return res.json(ok(CRITERIA_DESCRIPTION))

    const skills = job.required_skills.length > 0 ? job.required_skills.join(', ') : null
    const criteria = [
      { label: 'Umur', value: '18–35 tahun' },
      { label: 'Pendidikan', value: `Minimal ${job.min_education ?? 'D3'}` },
      { label: 'IPK', value: `Minimal ${(job.min_gpa ?? 3.0).toFixed(2)}` },
      ...(skills ? [{ label: 'Keahlian', value: `Minimal satu dari: ${skills}` }] : []),
      ...(job.required_experience ? [{ label: 'Pengalaman', value: job.required_experience }] : []),
    ]
    return res.json(ok(criteria))
  }),
)

// ── 0b. Recruitment on/off switch ────────────────────────────────────────────
// Public GET so the /apply form knows whether to show itself; PATCH is HR-only.
const recruitmentSettingSchema = z.object({ is_open: z.boolean() })

applicationsRouter.get(
  '/recruitment-status',
  asyncHandler(async (_req, res) => {
    res.json(ok(await getRecruitmentSetting()))
  }),
)

applicationsRouter.patch(
  '/recruitment-status',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(recruitmentSettingSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof recruitmentSettingSchema>
    const updated = await prisma.recruitmentSetting.upsert({
      where: { id: 'default' },
      update: body,
      create: { id: 'default', ...body },
    })
    res.json(ok(updated))
  }),
)

// ── 1. Public submission from the landing page /apply form ──────────────────
applicationsRouter.post(
  '/',
  publicApplyLimiter,
  validateBody(submitSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof submitSchema>

    const setting = await getRecruitmentSetting()
    if (!setting.is_open) {
      return res.status(403).json(fail('Pendaftaran lowongan saat ini ditutup'))
    }

    // One active application per email — resubmit allowed once decided.
    const active = await prisma.jobApplication.findFirst({
      where: { email: body.email, status: { in: ['new', 'interview'] } },
    })
    if (active) {
      return res.status(409).json(fail('Lamaran dengan email ini sedang diproses'))
    }

    const cv_mime = body.cv_data.slice(5, body.cv_data.indexOf(';'))

    // If job_id provided, fetch job-specific criteria for screening
    let jobCriteria: { min_age: number; max_age: number; min_education: string; min_gpa: number; skills: string[] } | null = null
    if (body.job_id) {
      const job = await prisma.jobPosting.findUnique({
        where: { job_id: body.job_id, status: 'open' },
        select: { min_gpa: true, min_education: true, required_skills: true },
      })
      if (!job) {
        return res.status(404).json(fail('Lowongan tidak ditemukan atau sudah ditutup'))
      }
      jobCriteria = {
        min_age: 18,
        max_age: 35,
        min_education: job.min_education ?? 'D3',
        min_gpa: job.min_gpa ?? 3.0,
        skills: job.required_skills,
      }
    }

    // Authoritative screening runs server-side at submission (the /screen call
    // on upload is only a preview) — falls back to the heuristic on any OpenAI
    // failure, so submission never blocks.
    const screening = await screenCv(body.cv_data, jobCriteria ?? undefined)
    const created = await prisma.jobApplication.create({
      data: {
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        age: screening.profile.age,
        education: screening.profile.education,
        gpa: screening.profile.gpa,
        graduation_year: screening.profile.graduation_year,
        skills: screening.profile.skills,
        cv_name: body.cv_name,
        cv_mime,
        cv_data: body.cv_data,
        ai_summary: screening.summary,
        ai_source: screening.source,
        ai_meets_criteria: screening.meets_criteria,
        ai_department: screening.profile.skills.length
          ? deriveDepartment(screening.profile.skills)
          : null,
        job_id: body.job_id ?? null,
      },
      select: LIST_SELECT,
    })
    return res.status(201).json(ok(created))
  }),
)

// ── 2. HR admin list ─────────────────────────────────────────────────────────
applicationsRouter.get(
  '/',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.jobApplication.findMany({
      select: LIST_SELECT,
      orderBy: { submitted_at: 'desc' },
    })
    res.json(ok(rows, { total: rows.length }))
  }),
)

// ── 3. Candidate detail ──────────────────────────────────────────────────────
applicationsRouter.get(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const app = await prisma.jobApplication.findUnique({
      where: { application_id: req.params.id },
      select: LIST_SELECT,
    })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    return res.json(ok(app))
  }),
)

// CV binary — decoded from the stored data URL so the client can preview
// (blob URL in an iframe) or download it.
applicationsRouter.get(
  '/:id/cv',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const app = await prisma.jobApplication.findUnique({
      where: { application_id: req.params.id },
      select: { cv_name: true, cv_mime: true, cv_data: true },
    })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    const base64 = app.cv_data.slice(app.cv_data.indexOf(',') + 1)
    const buffer = Buffer.from(base64, 'base64')
    res.setHeader('Content-Type', app.cv_mime)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(app.cv_name)}"`)
    return res.send(buffer)
  }),
)

// ── 4. Shortlist: New → Interview + auto interview invitation email ─────────
// HR fills mode (address required when offline) in a small form; the
// interviewer is not a free-text field — it is locked to whichever HR admin
// is performing the shortlist action, taken from the authenticated session.
const shortlistSchema = z
  .object({
    mode: z.enum(['online', 'offline']),
    location: z.string().trim().min(5).max(200).optional(),
  })
  .refine(d => d.mode === 'online' || !!d.location, {
    message: 'Alamat wajib diisi untuk interview offline',
    path: ['location'],
  })

applicationsRouter.patch(
  '/:id/shortlist',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(shortlistSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof shortlistSchema>
    const app = await prisma.jobApplication.findUnique({ where: { application_id: req.params.id } })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    if (app.status !== 'new') {
      return res.status(409).json(fail('Hanya pelamar berstatus Baru yang dapat di-shortlist'))
    }

    const hrUser = await prisma.user.findUnique({
      where: { user_id: req.user!.sub },
      select: { full_name: true },
    })
    const details = { interviewer: hrUser?.full_name ?? 'Tim HR Manava', mode: body.mode, location: body.location }

    // The transition is committed first — a slow or dead SMTP server must
    // never hold the decision hostage. The email then gets a short wait
    // budget; past that it keeps sending in the background.
    const emailBody = renderInterviewEmail(app, details)
    const updated = await prisma.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'interview', invited_at: new Date(), interview_email: emailBody },
      select: LIST_SELECT,
    })
    const mail = await sendEmailBounded(app.email, 'Undangan Interview — Staf Manava', emailBody)
    return res.json(ok({ application: updated, email: mail }))
  }),
)

// ── 5/6. Approve: Interview → Approved + auto-create editor account ─────────
// HR confirms the department placement in a popup first; the chosen name is
// sent here. Without it the AI recommendation from the CV screening is used.
const approveSchema = z.object({
  department: z.string().trim().min(1).max(80).optional(),
})

applicationsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(approveSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof approveSchema>
    const app = await prisma.jobApplication.findUnique({ where: { application_id: req.params.id } })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    if (app.status !== 'interview') {
      return res.status(409).json(fail('Hanya pelamar tahap Interview yang dapat disetujui'))
    }

    const account = await createEditorAccount(app, body.department)
    // Deliver the temporary password to the new editor — previously it was
    // only shown once on the HR screen with no channel to the employee.
    const mail = await sendEmailBounded(
      app.email,
      'Selamat Bergabung di Manava — Akun Staf Anda',
      renderCredentialsEmail(app.full_name, account, env.APP_URL),
    )
    const updated = await prisma.jobApplication.findUnique({
      where: { application_id: app.application_id },
      select: LIST_SELECT,
    })
    return res.json(ok({ application: updated, account, email: mail }))
  }),
)

// Reject — allowed from New (screening) or Interview (post-interview).
// The candidate is notified by a templated email; delivery failure must not
// block the decision, so the status still flips and HR sees the mail status.
applicationsRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const app = await prisma.jobApplication.findUnique({ where: { application_id: req.params.id } })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    if (app.status !== 'new' && app.status !== 'interview') {
      return res.status(409).json(fail('Lamaran sudah diputuskan'))
    }

    const updated = await prisma.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'rejected', decided_at: new Date() },
      select: LIST_SELECT,
    })
    const mail = await sendEmailBounded(
      app.email,
      'Hasil Lamaran Anda — Staf Manava',
      renderRejectionEmail(app),
    )
    return res.json(ok({ application: updated, email: mail }))
  }),
)
