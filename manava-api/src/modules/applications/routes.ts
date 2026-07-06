import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import { publicApplyLimiter } from '../../lib/rateLimit.js'
import { sendEmail } from '../../lib/mailer.js'
import { env } from '../../config/env.js'
import {
  createEditorAccount,
  deriveDepartment,
  renderCredentialsEmail,
  renderInterviewEmail,
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
})

// Public list/detail fields — cv_data is excluded (streamed via /:id/cv).
const LIST_SELECT = {
  application_id: true,
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
// server-side at submission (the form itself shows no AI result).
applicationsRouter.get('/criteria', (_req, res) => {
  res.json(ok(CRITERIA_DESCRIPTION))
})

// ── 1. Public submission from the landing page /apply form ──────────────────
applicationsRouter.post(
  '/',
  publicApplyLimiter,
  validateBody(submitSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof submitSchema>

    // One active application per email — resubmit allowed once decided.
    const active = await prisma.jobApplication.findFirst({
      where: { email: body.email, status: { in: ['new', 'interview'] } },
    })
    if (active) {
      return res.status(409).json(fail('Lamaran dengan email ini sedang diproses'))
    }

    const cv_mime = body.cv_data.slice(5, body.cv_data.indexOf(';'))
    // Authoritative screening runs server-side at submission (the /screen call
    // on upload is only a preview) — falls back to the heuristic on any OpenAI
    // failure, so submission never blocks.
    const screening = await screenCv(body.cv_data)
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
// HR fills interviewer + mode (address required when offline) in a small form;
// the details are embedded in the templated invitation email.
const shortlistSchema = z
  .object({
    interviewer: z.string().trim().min(2).max(100),
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

    // Delivery failure must not block the pipeline: the transition still
    // happens and HR sees the delivery status to follow up manually.
    const emailBody = renderInterviewEmail(app, body)
    const mail = await sendEmail(app.email, 'Undangan Interview — Editor Manava', emailBody)

    const updated = await prisma.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'interview', invited_at: new Date(), interview_email: emailBody },
      select: LIST_SELECT,
    })
    return res.json(ok({ application: updated, email: mail }))
  }),
)

// ── 5/6. Approve: Interview → Approved + auto-create editor account ─────────
applicationsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const app = await prisma.jobApplication.findUnique({ where: { application_id: req.params.id } })
    if (!app) return res.status(404).json(fail('Lamaran tidak ditemukan'))
    if (app.status !== 'interview') {
      return res.status(409).json(fail('Hanya pelamar tahap Interview yang dapat disetujui'))
    }

    const account = await createEditorAccount(app)
    // Deliver the temporary password to the new editor — previously it was
    // only shown once on the HR screen with no channel to the employee.
    const mail = await sendEmail(
      app.email,
      'Selamat Bergabung di Manava — Akun Editor Anda',
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
    return res.json(ok(updated))
  }),
)
