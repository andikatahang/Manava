import type { Editor } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../middleware/errorHandler.js'
import { getSettings, dateKeyOf, parseHM, minutesOfDay } from '../attendance/service.js'

// Simple 8h/day, 1.5x overtime premium — adjustable once real payroll policy
// is defined; there is no labor-law-certified calculation here (demo scale).
const STANDARD_HOURS_PER_DAY = 8
const OVERTIME_MULTIPLIER = 1.5

export function parsePeriod(period: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(period)
  if (!m) throw new HttpError(400, 'Format periode harus YYYY-MM')
  const year = Number(m[1])
  const month = Number(m[2])
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day of this month
  return { start, end }
}

export interface PayrollInputs {
  workingDays: number
  absentDays: number
  attendanceDeduction: number
  overtimeMinutes: number
  overtimePay: number
}

// Attendance-driven payroll math:
//  - weekday in the period with no approved leave and no attendance record
//    (or an explicitly rejected 'absent' record) → unpaid absence
//  - daily rate = base_salary / working_days; deduction = daily rate * absent days
//  - overtime = minutes clocked out past the scheduled clock-out time, paid
//    at 1.5x the derived hourly rate
export async function computePayrollInputs(
  editor: Pick<Editor, 'user_id' | 'base_salary'>,
  periodStart: Date,
  periodEnd: Date,
): Promise<PayrollInputs> {
  const settings = await getSettings()
  const scheduledOutMinutes = parseHM(settings.clock_out_time)

  const [records, leaves] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { user_id: editor.user_id, date: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        requester_id: editor.user_id,
        status: 'approved',
        start_date: { lte: periodEnd },
        end_date: { gte: periodStart },
      },
    }),
  ])

  const recordByDate = new Map(records.map(r => [dateKeyOf(r.date), r]))
  const leaveDates = new Set<string>()
  for (const lv of leaves) {
    for (const d = new Date(lv.start_date); d <= lv.end_date; d.setUTCDate(d.getUTCDate() + 1)) {
      leaveDates.add(dateKeyOf(d))
    }
  }

  let workingDays = 0
  let absentDays = 0
  let overtimeMinutes = 0

  for (const d = new Date(periodStart); d <= periodEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) continue // weekend — not a working day

    workingDays++
    const key = dateKeyOf(d)
    if (leaveDates.has(key)) continue // approved leave — paid, not absent

    const record = recordByDate.get(key)
    if (!record || record.status === 'absent') {
      absentDays++
      continue
    }
    const clockOut = record.clock_out ?? record.adjusted_clock_out
    if (clockOut) {
      const outMinutes = minutesOfDay(clockOut)
      if (outMinutes > scheduledOutMinutes) overtimeMinutes += outMinutes - scheduledOutMinutes
    }
  }

  const dailyRate = workingDays > 0 ? editor.base_salary / workingDays : 0
  const attendanceDeduction = Math.round(dailyRate * absentDays)
  const hourlyRate = dailyRate / STANDARD_HOURS_PER_DAY
  const overtimePay = Math.round(hourlyRate * OVERTIME_MULTIPLIER * (overtimeMinutes / 60))

  return { workingDays, absentDays, attendanceDeduction, overtimeMinutes, overtimePay }
}

// Regenerating an already-finalized/paid payslip would silently overwrite a
// reconciled record — only draft (or not-yet-existing) payslips are recomputed.
export async function generatePayslipForEditor(editor: Editor, period: string) {
  const { start, end } = parsePeriod(period)
  const existing = await prisma.payslip.findUnique({
    where: { editor_id_period_start: { editor_id: editor.editor_id, period_start: start } },
  })
  if (existing && existing.status !== 'draft') {
    return { payslip: existing, regenerated: false }
  }

  const inputs = await computePayrollInputs(editor, start, end)
  const project_bonus = existing?.project_bonus ?? 0
  const reimbursement_total = existing?.reimbursement_total ?? 0
  const net_salary =
    editor.base_salary - inputs.attendanceDeduction + inputs.overtimePay + project_bonus + reimbursement_total

  const data = {
    editor_id: editor.editor_id,
    editor_name: editor.full_name,
    period_start: start,
    period_end: end,
    working_days: inputs.workingDays,
    absent_days: inputs.absentDays,
    base_salary: editor.base_salary,
    attendance_deduction: inputs.attendanceDeduction,
    overtime_minutes: inputs.overtimeMinutes,
    overtime_pay: inputs.overtimePay,
    project_bonus,
    reimbursement_total,
    net_salary,
  }

  const payslip = await prisma.payslip.upsert({
    where: { editor_id_period_start: { editor_id: editor.editor_id, period_start: start } },
    create: data,
    update: data,
  })
  return { payslip, regenerated: true }
}
