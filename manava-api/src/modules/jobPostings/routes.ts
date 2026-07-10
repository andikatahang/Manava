import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, fail } from '../../lib/response.js'
import {
  listJobPostings,
  getJobPosting,
  createJobPosting,
  updateJobPosting,
  setJobPostingStatus,
  deleteJobPosting,
  mapJobPostingToCriteria,
  type CreateJobPostingInput,
  type UpdateJobPostingInput,
} from './service.js'

export const jobPostingsRouter = Router()

const HR_ROLES = ['hr_admin', 'superadmin'] as const

const createJobPostingSchema = z.object({
  title: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(80),
  position: z.string().trim().min(2).max(80),
  work_type: z.enum(['fulltime', 'parttime']),
  work_system: z.enum(['remote', 'hybrid', 'onsite']),
  description: z.string().trim().max(5000).optional().nullable(),
  min_gpa: z.number().min(0).max(4).optional().nullable(),
  min_education: z.string().trim().max(10).optional().nullable(),
  required_skills: z.array(z.string().trim().min(1).max(40)).min(1),
  required_experience: z.string().trim().max(100).optional().nullable(),
  specialization: z.array(z.string().trim().min(1).max(40)),
  status: z.enum(['open', 'closed']).default('open'),
})

const updateJobPostingSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(80).optional(),
  position: z.string().trim().min(2).max(80).optional(),
  work_type: z.enum(['fulltime', 'parttime']).optional(),
  work_system: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  min_gpa: z.number().min(0).max(4).optional().nullable(),
  min_education: z.string().trim().max(10).optional().nullable(),
  required_skills: z.array(z.string().trim().min(1).max(40)).min(1).optional(),
  required_experience: z.string().trim().max(100).optional().nullable(),
  specialization: z.array(z.string().trim().min(1).max(40)).optional(),
  status: z.enum(['open', 'closed']).optional(),
})

const setStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
})

// ── 0. Public: list open job postings ─────────────────────────────────────────
jobPostingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeClosed = req.query.include_closed === 'true'
    const jobs = await listJobPostings(includeClosed)
    res.json(ok(jobs, { total: jobs.length }))
  }),
)

// ── 1. Public: get single job posting with criteria ───────────────────────────
jobPostingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const job = await getJobPosting(req.params.id)
    if (!job) {
      res.status(404).json(fail('Lowongan tidak ditemukan'))
      return
    }
    const criteria = mapJobPostingToCriteria(job)
    res.json(ok({ job, criteria }))
  }),
)

// ── 2. HR: create job posting ─────────────────────────────────────────────────
jobPostingsRouter.post(
  '/',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(createJobPostingSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateJobPostingInput
    const job = await createJobPosting({ ...body, created_by_id: req.user!.sub })
    res.status(201).json(ok(job))
  }),
)

// ── 3. HR: update job posting ─────────────────────────────────────────────────
jobPostingsRouter.patch(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(updateJobPostingSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateJobPostingInput
    const job = await updateJobPosting(req.params.id, body)
    res.json(ok(job))
  }),
)

// ── 4. HR: open/close job posting ─────────────────────────────────────────────
jobPostingsRouter.patch(
  '/:id/status',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(setStatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: 'open' | 'closed' }
    const job = await setJobPostingStatus(req.params.id, status)
    res.json(ok(job))
  }),
)

// ── 5. HR: delete job posting ─────────────────────────────────────────────────
jobPostingsRouter.delete(
  '/:id',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    await deleteJobPosting(req.params.id)
    res.json(ok(null, { message: 'Lowongan dihapus' }))
  }),
)