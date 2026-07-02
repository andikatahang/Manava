import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import {
  createEditorAccount,
  generateAiSummary,
  renderInterviewEmail,
  sendEmailMock,
} from './service.js'

export const applicationsRouter = Router()

// ~5MB file → ~6.8M base64 chars; cap a bit above that.
const MAX_CV_DATA_LENGTH = 7_500_000
const CV_DATA_URL_RE =
  /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/]+=*$/

const submitSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  age: z.number().int().min(17).max(70),
  phone: z.string().trim().min(6).max(30),
  education: z.string().trim().min(1).max(20),
  gpa: z.number().min(0).max(4),
  graduation_year: z.number().int().min(1980).max(2026),
  skills: z.array(z.string().trim().min(1)).min(1).max(8),
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
  status: true,
  invited_at: true,
  interview_email: true,
  decided_at: true,
  created_user_id: true,
  submitted_at: true,
} as const

const HR_ROLES = ['hr_admin', 'superadmin'] as const

// ── 1. Public submission from the landing page /apply form ──────────────────
applicationsRouter.post(
  '/',
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
    const created = await prisma.jobApplication.create({
      data: {
        full_name: body.full_name,
        email: body.email,
        age: body.age,
        phone: body.phone,
        education: body.education,
        gpa: body.gpa,
        graduation_year: body.graduation_year,
        skills: body.skills,
        cv_name: body.cv_name,
        cv_mime,
        cv_data: body.cv_data,
        ai_summary: generateAiSummary(body),
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

    const emailBody = renderInterviewEmail(app, body)
    sendEmailMock(app.email, 'Undangan Interview — Editor Manava', emailBody)

    const updated = await prisma.jobApplication.update({
      where: { application_id: app.application_id },
      data: { status: 'interview', invited_at: new Date(), interview_email: emailBody },
      select: LIST_SELECT,
    })
    return res.json(ok(updated))
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
    const updated = await prisma.jobApplication.findUnique({
      where: { application_id: app.application_id },
      select: LIST_SELECT,
    })
    return res.json(ok({ application: updated, account }))
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
