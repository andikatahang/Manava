// Attendance domain helpers: WIB time math, schedule settings, the daily
// code, and the lazy "day close" that flags forgotten clock-outs for HR.

import { randomInt } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

// Company clock runs on WIB. UTC+7 has no DST, so fixed-offset math is safe.
export const TIMEZONE = 'Asia/Jakarta'
const UTC_OFFSET = '+07:00'

// The code becomes usable a bit before the official clock-in time so early
// arrivals are not rejected.
export const CODE_OPENS_BEFORE_MINUTES = 30

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

// ── Daily code ───────────────────────────────────────────────────────────────

// No ambiguous characters (0/O, 1/I/L) — the code is read aloud or copied.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

export async function getOrCreateTodayCode(generatedById?: string) {
  const date = new Date(todayKey())
  const existing = await prisma.attendanceCode.findUnique({ where: { date } })
  if (existing) return existing
  return prisma.attendanceCode.create({
    data: { date, code: generateCode(), generated_by_id: generatedById ?? null },
  })
}

export async function regenerateTodayCode(generatedById: string) {
  const date = new Date(todayKey())
  return prisma.attendanceCode.upsert({
    where: { date },
    update: { code: generateCode(), generated_by_id: generatedById },
    create: { date, code: generateCode(), generated_by_id: generatedById },
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

// ── Clock-in rate limit ──────────────────────────────────────────────────────

// In-memory guard so the daily code cannot be brute-forced. Per-user, resets
// on process restart — good enough for MVP scale.
const RATE_WINDOW_MS = 60_000
const RATE_MAX_ATTEMPTS = 5
const attemptLog = new Map<string, number[]>()

export function allowClockInAttempt(userId: string): boolean {
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

export function deriveClockInStatus(
  clockIn: Date,
  settings: { clock_in_time: string; grace_minutes: number },
): 'present' | 'late' {
  return minutesOfDay(clockIn) > parseHM(settings.clock_in_time) + settings.grace_minutes
    ? 'late'
    : 'present'
}

// Shared shape for every record the API returns: the owner's name/role plus
// who adjusted it (data-transparency requirement).
export const RECORD_INCLUDE = {
  user: { select: { full_name: true, role: true } },
  adjuster: { select: { full_name: true } },
} as const
