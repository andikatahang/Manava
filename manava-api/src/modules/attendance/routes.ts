import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { ok, fail } from '../../lib/response.js'
import {
  RECORD_INCLUDE,
  allowCodeAttempt,
  atTimeWIB,
  dateKeyOf,
  deriveClockInStatus,
  finalizeOverdueRecords,
  getActiveSession,
  getSettings,
  openSession,
  parseHM,
  todayKey,
} from './service.js'

export const attendanceRouter = Router()

// Everyone with an account clocks in — the disabled roles never reach here
// because they cannot log in at the auth gate.
const CLOCKING_ROLES = ['editor', 'admin_manager', 'hr_admin', 'superadmin'] as const
const HR_ROLES: readonly string[] = ['hr_admin', 'superadmin']

const HM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam HH:MM')

const codeSchema = z.object({ code: z.string().min(1, 'Kode presensi wajib diisi') })

const openSessionSchema = z.object({
  type: z.enum(['masuk', 'keluar']),
  duration_minutes: z.number().int().min(5).max(720),
})

const explanationSchema = z.object({
  explanation: z.string().min(1, 'Penjelasan wajib diisi'),
  proposed_clock_out: HM.optional(),
})

const approveSchema = z.object({
  adjusted_clock_out: HM,
  note: z.string().min(1, 'Catatan wajib diisi'),
})

const rejectSchema = z.object({ note: z.string().min(1, 'Catatan wajib diisi') })

const settingsSchema = z
  .object({
    clock_in_time: HM,
    clock_out_time: HM,
    code_duration_minutes: z.number().int().min(15).max(720),
  })
  .refine(s => parseHM(s.clock_in_time) < parseHM(s.clock_out_time), {
    message: 'Jam pulang harus setelah jam masuk',
    path: ['clock_out_time'],
  })

const listQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  user_id: z.string().optional(),
  review: z.enum(['pending', 'approved', 'rejected']).optional(),
})

// ── Today bootstrap (QuickAttendance card + notifications) ──────────────────

// Public shape of a session. The code is included for every authenticated
// user: Admin Managers and Editors receive it via the in-app notification and
// type it back to confirm presence.
function sessionPayload(s: Awaited<ReturnType<typeof getActiveSession>>) {
  if (!s) return null
  return {
    id: s.id,
    type: s.type,
    code: s.code,
    duration_minutes: s.duration_minutes,
    opened_at: s.opened_at,
    expires_at: s.expires_at,
  }
}

attendanceRouter.get(
  '/today',
  authenticate,
  asyncHandler(async (req, res) => {
    await finalizeOverdueRecords()
    const settings = await getSettings()
    const [record, masuk, keluar] = await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: { user_id_date: { user_id: req.user!.sub, date: new Date(todayKey()) } },
        include: RECORD_INCLUDE,
      }),
      getActiveSession('masuk'),
      getActiveSession('keluar'),
    ])
    // `me` lets the client scope shared lists (e.g. leave overlays) to itself.
    res.json(ok({
      record,
      settings,
      sessions: { masuk: sessionPayload(masuk), keluar: sessionPayload(keluar) },
      server_date: todayKey(),
      me: req.user!.sub,
    }))
  }),
)

// ── Clock in / out ───────────────────────────────────────────────────────────

attendanceRouter.post(
  '/clock-in',
  authenticate,
  requireRole(...CLOCKING_ROLES),
  validateBody(codeSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub
    if (!allowCodeAttempt(userId)) {
      return res.status(429).json(fail('Terlalu banyak percobaan. Coba lagi dalam satu menit.'))
    }

    // Clock-in is possible only while HR has a "masuk" session open.
    const session = await getActiveSession('masuk')
    if (!session) {
      return res.status(422).json(fail('Presensi masuk belum dibuka oleh HR Admin.'))
    }
    const { code } = req.body as z.infer<typeof codeSchema>
    if (code.trim().toUpperCase() !== session.code) {
      return res.status(422).json(fail('Kode presensi salah.'))
    }

    const settings = await getSettings()
    const now = new Date()
    const date = new Date(todayKey(now))
    const existing = await prisma.attendanceRecord.findUnique({
      where: { user_id_date: { user_id: userId, date } },
    })
    if (existing) return res.status(409).json(fail('Anda sudah clock-in hari ini.'))

    const created = await prisma.attendanceRecord.create({
      data: {
        user_id: userId,
        date,
        clock_in: now, // server time only — the client never supplies timestamps
        status: deriveClockInStatus(now, settings),
      },
      include: RECORD_INCLUDE,
    })
    return res.status(201).json(ok(created))
  }),
)

// Clock-out mirrors clock-in: only while HR has a "keluar" session open, and
// the session code is required.
attendanceRouter.post(
  '/clock-out',
  authenticate,
  requireRole(...CLOCKING_ROLES),
  validateBody(codeSchema),
  asyncHandler(async (req, res) => {
    if (!allowCodeAttempt(req.user!.sub)) {
      return res.status(429).json(fail('Terlalu banyak percobaan. Coba lagi dalam satu menit.'))
    }

    const session = await getActiveSession('keluar')
    if (!session) {
      return res.status(422).json(fail('Presensi keluar belum dibuka oleh HR Admin.'))
    }
    const { code } = req.body as z.infer<typeof codeSchema>
    if (code.trim().toUpperCase() !== session.code) {
      return res.status(422).json(fail('Kode presensi salah.'))
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { user_id_date: { user_id: req.user!.sub, date: new Date(todayKey()) } },
    })
    if (!record?.clock_in) return res.status(422).json(fail('Anda belum clock-in hari ini.'))
    if (record.clock_out) return res.status(409).json(fail('Anda sudah clock-out hari ini.'))

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { clock_out: new Date() },
      include: RECORD_INCLUDE,
    })
    return res.json(ok(updated))
  }),
)

// ── History ──────────────────────────────────────────────────────────────────

// Editors / Admin Managers always see their own history; HR can see everyone
// or filter by user. `review=pending` powers the header notification badge.
attendanceRouter.get(
  '/',
  authenticate,
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    await finalizeOverdueRecords()
    const q = (req as typeof req & { validatedQuery: z.infer<typeof listQuerySchema> }).validatedQuery
    const isHR = HR_ROLES.includes(req.user!.role)
    // "me" lets any client scope to itself without knowing its own id; non-HR
    // callers are always forced to their own records regardless of the param.
    const scopeUserId = isHR ? (q.user_id === 'me' ? req.user!.sub : q.user_id) : req.user!.sub

    const monthFilter = q.month
      ? { gte: new Date(`${q.month}-01`), lt: nextMonth(q.month) }
      : undefined

    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(scopeUserId ? { user_id: scopeUserId } : {}),
        ...(monthFilter ? { date: monthFilter } : {}),
        ...(q.review ? { review: q.review } : {}),
      },
      include: RECORD_INCLUDE,
      orderBy: { date: 'desc' },
    })
    res.json(ok(records, { total: records.length }))
  }),
)

// HR work queue: every forgotten clock-out awaiting a decision, oldest first
// so nothing rots past the payroll cutoff.
attendanceRouter.get(
  '/review-queue',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  asyncHandler(async (_req, res) => {
    await finalizeOverdueRecords()
    const records = await prisma.attendanceRecord.findMany({
      where: { review: 'pending' },
      include: RECORD_INCLUDE,
      orderBy: { date: 'asc' },
    })
    res.json(ok(records, { total: records.length }))
  }),
)

// ── User explanation ─────────────────────────────────────────────────────────

attendanceRouter.patch(
  '/:id/explanation',
  authenticate,
  validateBody(explanationSchema),
  asyncHandler(async (req, res) => {
    const record = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } })
    if (!record) return res.status(404).json(fail('Catatan presensi tidak ditemukan'))
    if (record.user_id !== req.user!.sub) {
      return res.status(403).json(fail('Hanya pemilik catatan yang dapat mengirim penjelasan'))
    }
    if (record.review !== 'pending') {
      return res.status(409).json(fail('Catatan ini tidak sedang menunggu tinjauan'))
    }

    const body = req.body as z.infer<typeof explanationSchema>
    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        user_explanation: body.explanation,
        proposed_clock_out: body.proposed_clock_out
          ? atTimeWIB(dateKeyOf(record.date), body.proposed_clock_out)
          : null,
      },
      include: RECORD_INCLUDE,
    })
    return res.json(ok(updated))
  }),
)

// ── HR decision ──────────────────────────────────────────────────────────────

attendanceRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  validateBody(approveSchema),
  asyncHandler(async (req, res) => {
    const record = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } })
    if (!record) return res.status(404).json(fail('Catatan presensi tidak ditemukan'))
    if (record.review !== 'pending') {
      return res.status(409).json(fail('Catatan ini sudah diputuskan'))
    }

    const body = req.body as z.infer<typeof approveSchema>
    const dateKey = dateKeyOf(record.date)
    const settings = await getSettings()
    const adjusted = atTimeWIB(dateKey, body.adjusted_clock_out)
    if (record.clock_in && adjusted <= record.clock_in) {
      return res.status(422).json(fail('Jam pulang harus setelah jam clock-in'))
    }
    // Cap at the scheduled clock-out: an adjustment restores normal hours,
    // it never grants overtime.
    if (parseHM(body.adjusted_clock_out) > parseHM(settings.clock_out_time)) {
      return res.status(422).json(fail(`Maksimal jam pulang terjadwal (${settings.clock_out_time})`))
    }

    // Approval repairs the clock-out but does not erase lateness — recompute
    // from the original clock-in against the current schedule.
    const status = record.clock_in ? deriveClockInStatus(record.clock_in, settings) : 'present'
    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status,
        review: 'approved',
        adjusted_clock_out: adjusted,
        adjusted_by_id: req.user!.sub,
        adjusted_at: new Date(),
        adjustment_note: body.note,
      },
      include: RECORD_INCLUDE,
    })
    return res.json(ok(updated))
  }),
)

attendanceRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  validateBody(rejectSchema),
  asyncHandler(async (req, res) => {
    const record = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } })
    if (!record) return res.status(404).json(fail('Catatan presensi tidak ditemukan'))
    if (record.review !== 'pending') {
      return res.status(409).json(fail('Catatan ini sudah diputuskan'))
    }

    const { note } = req.body as z.infer<typeof rejectSchema>
    // Rejected day counts as absent → feeds attendance_deduction at payroll.
    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: 'absent',
        review: 'rejected',
        adjusted_by_id: req.user!.sub,
        adjusted_at: new Date(),
        adjustment_note: note,
      },
      include: RECORD_INCLUDE,
    })
    return res.json(ok(updated))
  }),
)

// ── Settings & code (HR) ─────────────────────────────────────────────────────

attendanceRouter.get(
  '/settings',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json(ok(await getSettings()))
  }),
)

attendanceRouter.patch(
  '/settings',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  validateBody(settingsSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof settingsSchema>
    const updated = await prisma.attendanceSetting.upsert({
      where: { id: 'default' },
      update: body,
      create: { id: 'default', ...body },
    })
    res.json(ok(updated))
  }),
)

// "Buka Presensi": HR opens a masuk/keluar window with an explicit duration.
// Everyone with an account can then confirm presence with the session code.
attendanceRouter.post(
  '/sessions',
  authenticate,
  requireRole('hr_admin', 'superadmin'),
  validateBody(openSessionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof openSessionSchema>
    const session = await openSession(body.type, body.duration_minutes, req.user!.sub)
    res.status(201).json(ok(sessionPayload(session)))
  }),
)

function nextMonth(month: string): Date {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(m === 12 ? (y ?? 0) + 1 : y ?? 0, m === 12 ? 0 : m ?? 0, 1))
}
