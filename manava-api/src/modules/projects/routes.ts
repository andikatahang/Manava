// Endpoint alur booking klien ⇄ editor. Guard role kasar di sini (client /
// editor), aturan kepemilikan & transisi status di service.ts.

import { Router, type Request } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok } from '../../lib/response.js'
import * as service from './service.js'

export const projectsRouter = Router()

const viewerOf = (req: Request): service.Viewer => ({
  sub: req.user!.sub,
  role: req.user!.role,
})

// GET /api/v1/projects — di-scope per role (klien: miliknya, editor: tugasnya)
projectsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const projects = await service.listProjects(viewerOf(req))
    res.json(ok(projects, { total: projects.length }))
  }),
)

// GET /api/v1/projects/inbox — pesan terbaru lintas proyek milik viewer
projectsRouter.get(
  '/inbox',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15))
    const items = await service.getInbox(viewerOf(req), limit)
    res.json(ok(items, { total: items.length }))
  }),
)

// POST /api/v1/projects — klien membuka ruang diskusi dengan editor
const startBookingSchema = z.object({
  editor_id: z.string().min(1),
  note: z.string().trim().max(1000).optional(),
})
projectsRouter.post(
  '/',
  authenticate,
  requireRole('client'),
  validateBody(startBookingSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof startBookingSchema>
    const { project, created } = await service.startBooking(viewerOf(req), body.editor_id, body.note)
    res.status(created ? 201 : 200).json(ok(project, { created }))
  }),
)

projectsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const detail = await service.getProjectDetail(req.params.id, viewerOf(req))
    res.json(ok(detail))
  }),
)

// ── Chat ─────────────────────────────────────────────────────────────────────

projectsRouter.get(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const messages = await service.listMessages(req.params.id, viewerOf(req))
    res.json(ok(messages, { total: messages.length }))
  }),
)

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) })
projectsRouter.post(
  '/:id/messages',
  authenticate,
  requireRole('client', 'editor'),
  validateBody(messageSchema),
  asyncHandler(async (req, res) => {
    const { body } = req.body as z.infer<typeof messageSchema>
    const message = await service.sendTextMessage(req.params.id, viewerOf(req), body)
    res.status(201).json(ok(message))
  }),
)

// ── Brief ────────────────────────────────────────────────────────────────────

const briefSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  revision_limit: z.number().int().min(0).max(20).default(5),
  price: z.number().int().min(1),
})
projectsRouter.post(
  '/:id/brief',
  authenticate,
  requireRole('editor'),
  validateBody(briefSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof briefSchema>
    const contract = await service.sendBrief(req.params.id, viewerOf(req), input)
    res.status(201).json(ok(contract))
  }),
)

const respondSchema = z.object({ approve: z.boolean() })
projectsRouter.post(
  '/:id/brief/respond',
  authenticate,
  requireRole('client'),
  validateBody(respondSchema),
  asyncHandler(async (req, res) => {
    const { approve } = req.body as z.infer<typeof respondSchema>
    const result = await service.respondBrief(req.params.id, viewerOf(req), approve)
    res.json(ok(result))
  }),
)

// ── Preview hasil kerja ──────────────────────────────────────────────────────

// Preview boleh dikirim sebagai file gambar (data URL, akan di-watermark
// server-side) ATAU sebagai tautan eksternal. Salah satu, keduanya opsional
// selain catatan.
const deliverableSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  attachment_url: z.string().trim().url().max(500).optional(),
  image: z.object({
    data_url: z.string()
      .startsWith('data:image/')
      // ~8 MB base64 (data URL string dapat ~10.7 MB) — batas request body 12mb.
      .max(11_000_000),
    width: z.number().int().min(50).max(8000),
    height: z.number().int().min(50).max(8000),
  }).optional(),
})
projectsRouter.post(
  '/:id/deliverable',
  authenticate,
  requireRole('editor'),
  validateBody(deliverableSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof deliverableSchema>
    const message = await service.sendDeliverable(req.params.id, viewerOf(req), body)
    res.status(201).json(ok(message))
  }),
)

// ── Revisi (klasifikasi AI → kirim) ──────────────────────────────────────────

const classifySchema = z.object({ request_text: z.string().trim().min(10).max(2000) })
projectsRouter.post(
  '/:id/revisions/classify',
  authenticate,
  requireRole('client'),
  validateBody(classifySchema),
  asyncHandler(async (req, res) => {
    const { request_text } = req.body as z.infer<typeof classifySchema>
    const result = await service.classifyForProject(req.params.id, viewerOf(req), request_text)
    res.json(ok(result))
  }),
)

const revisionSchema = z.object({
  request_text: z.string().trim().min(10).max(2000),
  ai_label: z.enum(['minor', 'major', 'uncertain']),
  ai_confidence: z.number().min(0).max(1),
  ai_summary: z.string().trim().min(1).max(1000),
})
projectsRouter.post(
  '/:id/revisions',
  authenticate,
  requireRole('client'),
  validateBody(revisionSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof revisionSchema>
    const revision = await service.submitRevision(req.params.id, viewerOf(req), input)
    res.status(201).json(ok(revision))
  }),
)

// ── Selesai & ulasan ─────────────────────────────────────────────────────────

projectsRouter.post(
  '/:id/complete',
  authenticate,
  requireRole('client'),
  asyncHandler(async (req, res) => {
    const project = await service.completeProject(req.params.id, viewerOf(req))
    res.json(ok(project))
  }),
)

// ── Download file asli (klien, setelah proyek selesai) ───────────────────────

projectsRouter.get(
  '/:id/download',
  authenticate,
  requireRole('client'),
  asyncHandler(async (req, res) => {
    const files = await service.getDownloadableFiles(req.params.id, viewerOf(req))
    res.json(ok(files, { total: files.length }))
  }),
)

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
})
projectsRouter.post(
  '/:id/review',
  authenticate,
  requireRole('client'),
  validateBody(reviewSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof reviewSchema>
    const review = await service.submitReview(req.params.id, viewerOf(req), body.rating, body.comment)
    res.status(201).json(ok(review))
  }),
)
