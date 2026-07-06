// Attendance domain helpers: WIB time math, schedule settings, HR-opened
// presensi sessions, and the lazy "day close" that flags forgotten
// clock-outs for HR.

import { randomInt } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

// Company clock runs on WIB. UTC+7 has no DST, so fixed-offset math is safe.
export const TIMEZONE = 'Asia/Jakarta'
const UTC_OFFSET = '+07:00'

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false,
})

/** Calendar date in WIB as YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  return dateFmt.format(now)
}

/** Minutes since WIB midnight for an instant. */
export function minutesOfDay(d: Date): number {
  const [h, m] = timeFmt.format(d).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** "HH:MM" → minutes since midnight. Validated by Zod before it gets here. */
export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** The instant of "HH:MM" WIB on a given calendar day. */
export function atTimeWIB(dateKey: string, hm: string): Date {
  return new Date(`${dateKey}T${hm}:00${UTC_OFFSET}`)
}

/** Prisma @db.Date comes back as UTC midnight — recover the calendar key. */
export function dateKeyOf(dbDate: Date): string {
  return dbDate.toISOString().slice(0, 10)
}

// ── Settings ─────────────────────────────────────────────────────────────────

// Single-row config, created lazily with defaults — no seed dependency.
export async function getSettings() {
  return prisma.attendanceSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
}

// ── Presensi sessions ────────────────────────────────────────────────────────

// No ambiguous characters (0/O, 1/I/L) — the code is read aloud or copied.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

export type SessionType = 'masuk' | 'keluar'

/** The currently open session of a type, if any (not closed, not expired). */
export async function getActiveSession(type: SessionType) {
  return prisma.attendanceSession.findFirst({
    where: { type, closed_at: null, expires_at: { gt: new Date() } },
    orderBy: { opened_at: 'desc' },
  })
}

// "Buka Presensi": only one code may be active at a time. Opening a session
// closes EVERY still-open session of both types — otherwise a lingering
// "masuk" code stays valid into the "keluar" window and someone who never
// clocked in can register a clock-in at going-home time.
export async function openSession(type: SessionType, durationMinutes: number, openedById: string) {
  const now = new Date()
  return prisma.$transaction(async tx => {
    await tx.attendanceSession.updateMany({
      where: { closed_at: null, expires_at: { gt: now } },
      data: { closed_at: now },
    })
    return tx.attendanceSession.create({
      data: {
        date: new Date(todayKey(now)),
        type,
        code: generateCode(),
        duration_minutes: durationMinutes,
        opened_by_id: openedById,
        expires_at: new Date(now.getTime() + durationMinutes * 60_000),
      },
    })
  })
}

// ── Day close ────────────────────────────────────────────────────────────────

// Lazy finalization instead of a cron: any read of attendance data first
// sweeps past days that still have an open clock-in and flags them for HR.
export async function finalizeOverdueRecords(): Promise<void> {
  await prisma.attendanceRecord.updateMany({
    where: {
      date: { lt: new Date(todayKey()) },
      clock_in: { not: null },
      clock_out: null,
      review: 'none',
      status: { in: ['present', 'late'] },
    },
    data: { status: 'incomplete', review: 'pending' },
  })
}

// ── Code attempt rate limit ──────────────────────────────────────────────────

// In-memory guard so session codes cannot be brute-forced. Per-user, resets
// on process restart — good enough for MVP scale.
const RATE_WINDOW_MS = 60_000
const RATE_MAX_ATTEMPTS = 5
const attemptLog = new Map<string, number[]>()

export function allowCodeAttempt(userId: string): boolean {
  const now = Date.now()
  const recent = (attemptLog.get(userId) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX_ATTEMPTS) {
    attemptLog.set(userId, recent)
    return false
  }
  attemptLog.set(userId, [...recent, now])
  return true
}

// ── Status derivation ────────────────────────────────────────────────────────

// The schedule's clock_in_time stays the lateness reference even though the
// clock-in window itself is whatever session HR opened.
export function deriveClockInStatus(
  clockIn: Date,
  settings: { clock_in_time: string },
): 'present' | 'late' {
  return minutesOfDay(clockIn) > parseHM(settings.clock_in_time) ? 'late' : 'present'
}

// Shared shape for every record the API returns: the owner's name/role plus
// who adjusted it (data-transparency requirement).
export const RECORD_INCLUDE = {
  user: { select: { full_name: true, role: true } },
  adjuster: { select: { full_name: true } },
} as const
