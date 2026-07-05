// DB-backed attendance view (the "Presensi" tab of AttendancePage).
// Every role sees their own today-card + calendar; HR additionally gets the
// daily code panel, the schedule settings, and the "Perlu Tinjauan" queue for
// forgotten clock-outs (approve → fill clock-out, reject → counted absent).

import { useMemo, useState } from 'react'
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Copy, KeyRound, LogIn, LogOut, RefreshCw, Settings2, XCircle,
} from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Modal } from '../../components/ui/Modal'
import type { UserRole, LeaveRequest } from '../../types'
import {
  clockInDeadline, fmtTimeWIB,
  type Attendance, type AttendanceSettings, type AttendanceStatus,
} from '../../lib/attendance'
import {
  useAttendanceMutations, useAttendancePending, useAttendanceRecords,
  useAttendanceToday, useReviewQueue,
} from '../../hooks/queries/useAttendance'

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  late:       'bg-amber-100  text-amber-700  border-amber-200',
  incomplete: 'bg-orange-100 text-orange-700 border-orange-200',
  absent:     'bg-red-100    text-red-700    border-red-200',
  leave:      'bg-blue-100   text-blue-700   border-blue-200',
  partial:    'bg-gray-100   text-gray-600   border-gray-200',
}
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Hadir', late: 'Terlambat', incomplete: 'Perlu Tinjauan',
  absent: 'Absen', leave: 'Cuti', partial: 'Sebagian',
}
const REVIEW_LABEL = {
  pending: 'Menunggu tinjauan HR',
  approved: 'Disetujui HR',
  rejected: 'Ditolak HR',
} as const

const WEEK_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const HR_ROLES: readonly UserRole[] = ['hr_admin', 'superadmin']

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}
function fmtFullDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}
function fmtShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export function AttendanceTab({ role, leaves, flash }: {
  role: UserRole
  leaves: LeaveRequest[]
  flash: (msg: string) => void
}) {
  const isHR = HR_ROLES.includes(role)
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const todayQuery = useAttendanceToday()
  const myRecords = useAttendanceRecords({ month, user_id: 'me' })
  const myPending = useAttendancePending()
  const queueQuery = useReviewQueue(isHR)
  const mutations = useAttendanceMutations()

  const [dayDetail, setDayDetail] = useState<Attendance | null>(null)
  const [explainTarget, setExplainTarget] = useState<Attendance | null>(null)
  const [reviewTarget, setReviewTarget] = useState<Attendance | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const settings = todayQuery.data?.settings
  const today = todayQuery.data?.server_date ?? todayKey()
  const me = todayQuery.data?.me

  const recordMap = useMemo(
    () => Object.fromEntries((myRecords.data ?? []).map(r => [r.date, r])),
    [myRecords.data],
  )
  // Own pending items (for HR the pending query returns everyone — filter to
  // the queue instead; their own items appear there too).
  const myIncomplete = useMemo(
    () => (isHR ? [] : (myPending.data ?? [])),
    [isHR, myPending.data],
  )

  return (
    <div className="space-y-6">
      <TodayCard record={todayQuery.data?.record ?? null} settings={settings} today={today} mutations={mutations} />

      {isHR && settings && (
        <HrCodePanel
          code={todayQuery.data?.code ?? null}
          settings={settings}
          onRegenerate={() =>
            mutations.regenerateCode.mutate(undefined, {
              onSuccess: () => flash('Kode presensi hari ini diganti.'),
              onError: e => flash(e instanceof Error ? e.message : 'Gagal mengganti kode.'),
            })
          }
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {myIncomplete.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Anda lupa clock-out pada {myIncomplete.length} hari
          </p>
          <p className="text-xs text-orange-800/80 mt-1">
            Kirim penjelasan agar HR dapat mengisi jam pulang Anda. Tanpa penjelasan, HR memutuskan dari data yang ada.
          </p>
          <ul className="mt-3 space-y-2">
            {myIncomplete.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 bg-white border border-orange-200 rounded-xl px-3.5 py-2.5">
                <div className="text-xs text-navy">
                  <span className="font-semibold">{fmtFullDate(r.date)}</span>
                  <span className="text-navy/50"> · masuk {fmtTimeWIB(r.clock_in)} · pulang —</span>
                  {r.user_explanation && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3" />Penjelasan terkirim
                    </span>
                  )}
                </div>
                <button className="btn-secondary text-xs shrink-0" onClick={() => setExplainTarget(r)}>
                  {r.user_explanation ? 'Ubah penjelasan' : 'Kirim penjelasan'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isHR && (
        <ReviewQueueCard queue={queueQuery.data ?? []} onOpen={setReviewTarget} />
      )}

      <StatStrip records={myRecords.data ?? []} />

      <CalendarCard
        month={month}
        onMonthChange={setMonth}
        recordMap={recordMap}
        leaves={leaves.filter(l => l.requester_id === me)}
        today={today}
        onOpenDay={date => {
          const rec = recordMap[date]
          if (rec) setDayDetail(rec)
        }}
      />

      {/* Own day detail — full transparency: originals + HR adjustments */}
      <Drawer
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        title={dayDetail ? fmtFullDate(dayDetail.date) : ''}
        subtitle={dayDetail ? STATUS_LABEL[dayDetail.status] : ''}
      >
        {dayDetail && <DayDetailBody record={dayDetail} />}
      </Drawer>

      <ExplainDrawer
        record={explainTarget}
        settings={settings}
        onClose={() => setExplainTarget(null)}
        onSubmit={(id, explanation, proposed) =>
          mutations.explain.mutate(
            { id, input: { explanation, ...(proposed ? { proposed_clock_out: proposed } : {}) } },
            {
              onSuccess: () => { setExplainTarget(null); flash('Penjelasan terkirim ke HR.') },
              onError: e => flash(e instanceof Error ? e.message : 'Gagal mengirim penjelasan.'),
            },
          )
        }
        isPending={mutations.explain.isPending}
      />

      {isHR && (
        <ReviewDrawer
          record={reviewTarget}
          settings={settings}
          onClose={() => setReviewTarget(null)}
          onApprove={(id, time, note) =>
            mutations.approve.mutate(
              { id, input: { adjusted_clock_out: time, note } },
              {
                onSuccess: () => { setReviewTarget(null); flash('Presensi disetujui — jam pulang diisi.') },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal menyetujui.'),
              },
            )
          }
          onReject={(id, note) =>
            mutations.reject.mutate(
              { id, note },
              {
                onSuccess: () => { setReviewTarget(null); flash('Presensi ditolak — dihitung absen.') },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal menolak.'),
              },
            )
          }
          isPending={mutations.approve.isPending || mutations.reject.isPending}
        />
      )}

      {isHR && settings && (
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={input =>
            mutations.saveSettings.mutate(input, {
              onSuccess: () => { setSettingsOpen(false); flash('Jadwal presensi diperbarui.') },
              onError: e => flash(e instanceof Error ? e.message : 'Gagal menyimpan jadwal.'),
            })
          }
          isPending={mutations.saveSettings.isPending}
        />
      )}
    </div>
  )
}

// ── Today card (all roles clock in) ──────────────────────────────────────────

function TodayCard({ record, settings, today, mutations }: {
  record: Attendance | null
  settings: AttendanceSettings | undefined
  today: string
  mutations: ReturnType<typeof useAttendanceMutations>
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hasIn = !!record?.clock_in
  const hasOut = !!record?.clock_out

  function handleClockIn() {
    if (!code.trim()) { setError('Masukkan kode presensi hari ini.'); return }
    setError(null)
    mutations.clockIn.mutate(code.trim().toUpperCase(), {
      onSuccess: () => setCode(''),
      onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-in.'),
    })
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-navy/40 mb-1">Hari ini</p>
        <p className="text-sm text-navy/60 mb-2">{fmtFullDate(today)}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-navy leading-none">{hasIn ? fmtTimeWIB(record!.clock_in) : '--:--'}</p>
          <span className="text-navy/30">→</span>
          <p className="text-3xl font-bold text-navy leading-none">{hasOut ? fmtTimeWIB(record!.clock_out) : '--:--'}</p>
        </div>
        {settings && !hasIn && (
          <p className="text-xs text-navy/50 mt-2">
            Masuk sebelum <span className="font-medium text-navy">{settings.clock_in_time}</span> WIB · batas akhir clock-in {clockInDeadline(settings)} (tercatat terlambat).
          </p>
        )}
        {hasIn && !hasOut && (
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {record?.status === 'late' ? 'Anda masuk terlambat hari ini. ' : ''}Jangan lupa clock-out sebelum {settings?.clock_out_time ?? '17:00'}.
          </p>
        )}
        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!hasIn && (
          <>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-navy/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleClockIn() }}
                placeholder="Kode"
                maxLength={6}
                aria-label="Kode presensi hari ini"
                className="input w-28 pl-9 font-semibold tracking-[0.15em] uppercase placeholder:tracking-normal placeholder:font-normal"
              />
            </div>
            <button className="btn-primary" onClick={handleClockIn} disabled={mutations.clockIn.isPending}>
              <LogIn className="w-4 h-4" />{mutations.clockIn.isPending ? 'Memeriksa…' : 'Masuk'}
            </button>
          </>
        )}
        {hasIn && !hasOut && (
          <button
            className="btn-primary"
            onClick={() => mutations.clockOut.mutate(undefined, {
              onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-out.'),
            })}
            disabled={mutations.clockOut.isPending}
          >
            <LogOut className="w-4 h-4" />{mutations.clockOut.isPending ? 'Menyimpan…' : 'Keluar'}
          </button>
        )}
        {hasIn && hasOut && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />Hari kerja tercatat
          </span>
        )}
      </div>
    </div>
  )
}

// ── HR code + schedule panel ─────────────────────────────────────────────────

function HrCodePanel({ code, settings, onRegenerate, onOpenSettings }: {
  code: string | null
  settings: AttendanceSettings
  onRegenerate: () => void
  onOpenSettings: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-2xl border border-navy bg-navy text-white p-5 flex flex-wrap items-center gap-5">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Kode presensi hari ini</p>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold tracking-[0.3em] tabular-nums leading-none">{code ?? '······'}</p>
          <button
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Salin kode"
            onClick={() => {
              if (!code) return
              navigator.clipboard?.writeText(code).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }).catch(() => {})
            }}
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-white/60 mt-2">
          Berlaku s.d. {clockInDeadline(settings)} WIB — setelah {settings.clock_in_time} tercatat terlambat. Dibagikan ke semua pengguna; kode berganti otomatis tiap hari.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" onClick={onRegenerate}>
          <RefreshCw className="w-3.5 h-3.5" />Ganti kode
        </button>
        <button className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-white text-navy hover:bg-white/90 transition-colors" onClick={onOpenSettings}>
          <Settings2 className="w-3.5 h-3.5" />Atur jadwal
        </button>
      </div>
    </div>
  )
}

// ── HR review queue ──────────────────────────────────────────────────────────

function ReviewQueueCard({ queue, onOpen }: { queue: Attendance[]; onOpen: (r: Attendance) => void }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-navy">Perlu Tinjauan</h3>
          <p className="text-xs text-navy/50 mt-0.5">Clock-out yang terlupa — putuskan sebelum cutoff payroll.</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 border ${queue.length > 0 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
          {queue.length} menunggu
        </span>
      </div>
      {queue.length === 0 ? (
        <p className="text-sm text-navy/50 py-6 text-center">Tidak ada presensi yang menunggu tinjauan. 🎉</p>
      ) : (
        <ul className="divide-y divide-border">
          {queue.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="w-full text-left py-3 flex items-center gap-3 hover:bg-navy-50/40 transition-colors rounded-lg px-2 -mx-2"
              >
                <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0">
                  {r.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{r.user.full_name}</p>
                  <p className="text-xs text-navy/50">
                    {fmtShortDate(r.date)} · masuk {fmtTimeWIB(r.clock_in)} · pulang —
                    {r.user_explanation ? ' · penjelasan masuk' : ' · tanpa penjelasan'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-navy/30 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Stats ────────────────────────────────────────────────────────────────────

function StatStrip({ records }: { records: Attendance[] }) {
  const count = (s: AttendanceStatus) => records.filter(r => r.status === s).length
  const cells: Array<[string, number, string]> = [
    ['Hadir', count('present'), 'text-emerald-600'],
    ['Terlambat', count('late'), 'text-amber-600'],
    ['Perlu Tinjauan', count('incomplete'), 'text-orange-600'],
    ['Absen', count('absent'), 'text-red-600'],
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cells.map(([label, n, color]) => (
        <div key={label} className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-navy/40">{label}</p>
          <p className={`text-xl font-bold leading-tight mt-0.5 ${color}`}>{n}</p>
        </div>
      ))}
    </div>
  )
}

// ── Calendar ─────────────────────────────────────────────────────────────────

function CalendarCard({ month, onMonthChange, recordMap, leaves, today, onOpenDay }: {
  month: string // YYYY-MM
  onMonthChange: (m: string) => void
  recordMap: Record<string, Attendance>
  leaves: LeaveRequest[]
  today: string
  onOpenDay: (date: string) => void
}) {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y!, m!, 0).getDate()
  const firstDow = new Date(y!, m! - 1, 1).getDay()
  const monthLabel = new Date(y!, m! - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const shift = (delta: number) => {
    const d = new Date(y!, m! - 1 + delta, 1)
    onMonthChange(monthKey(d))
  }
  const dayDate = (day: number) => `${month}-${String(day).padStart(2, '0')}`
  const isWeekend = (day: number) => [0, 6].includes(new Date(y!, m! - 1, day).getDay())
  // Approved leave days render blue even though no attendance row exists.
  const onLeave = (date: string) =>
    leaves.some(l => l.status === 'approved' && l.start_date <= date && date <= l.end_date)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-navy">{monthLabel}</h3>
          <p className="text-xs text-navy/50 mt-0.5">Klik tanggal untuk lihat detail.</p>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 rounded-lg border border-border hover:bg-navy-50 transition-colors" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>
            <ChevronLeft className="w-4 h-4 text-navy/60" />
          </button>
          <button className="p-1.5 rounded-lg border border-border hover:bg-navy-50 transition-colors" aria-label="Bulan berikutnya" onClick={() => shift(1)}>
            <ChevronRight className="w-4 h-4 text-navy/60" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_HEADERS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-navy/40 py-1">{d}</div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => <div key={`off-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = dayDate(day)
          const rec = recordMap[date]
          const isToday = date === today
          const base = `rounded-lg p-1.5 text-center border transition-all ${isToday ? 'ring-2 ring-navy ring-offset-1' : ''}`

          if (rec) {
            return (
              <button
                key={date}
                type="button"
                onClick={() => onOpenDay(date)}
                className={`${base} cursor-pointer hover:scale-[1.03] ${STATUS_STYLE[rec.status]}`}
                title={STATUS_LABEL[rec.status]}
              >
                <p className="text-xs font-bold">{day}</p>
                {rec.clock_in && <p className="text-[9px] opacity-70">{fmtTimeWIB(rec.clock_in)}</p>}
              </button>
            )
          }
          if (onLeave(date)) {
            return (
              <div key={date} className={`${base} ${STATUS_STYLE.leave}`} title="Cuti">
                <p className="text-xs font-bold">{day}</p>
              </div>
            )
          }
          if (isWeekend(day)) {
            return (
              <div key={date} className={`${base} bg-gray-50 border-gray-100`}>
                <p className="text-xs text-navy/20">{day}</p>
              </div>
            )
          }
          return (
            <div key={date} className={`${base} bg-white border-border`}>
              <p className="text-xs text-navy/40">{day}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border">
        {(['present', 'late', 'incomplete', 'absent', 'leave'] as const).map(k => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-navy/60">
            <span className={`w-3 h-3 rounded-sm border ${STATUS_STYLE[k]}`} />
            {STATUS_LABEL[k]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day detail (transparency: original vs adjusted) ──────────────────────────

function DayDetailBody({ record }: { record: Attendance }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[record.status]}`}>
          {STATUS_LABEL[record.status]}
        </span>
        {record.review !== 'none' && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-navy/60">
            <Clock className="w-3.5 h-3.5" />{REVIEW_LABEL[record.review]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Clock-in" value={fmtTimeWIB(record.clock_in)} />
        <StatBox
          label="Clock-out"
          value={record.clock_out ? fmtTimeWIB(record.clock_out) : record.adjusted_clock_out ? `${fmtTimeWIB(record.adjusted_clock_out)}*` : '—'}
        />
      </div>

      {/* HR adjustment trail — the original clock-out stays visible as missing */}
      {record.adjusted_at && (
        <div className="rounded-xl border border-border bg-navy-50/30 p-4 text-xs text-navy/70 space-y-1">
          <p className="font-semibold text-navy">
            {record.review === 'rejected' ? 'Ditolak oleh HR' : `Clock-out diisi HR: ${fmtTimeWIB(record.adjusted_clock_out)}`}
          </p>
          <p>oleh {record.adjuster?.full_name ?? 'HR'} · {fmtShortDate(record.adjusted_at.slice(0, 10))}</p>
          {record.adjustment_note && <p className="italic">“{record.adjustment_note}”</p>}
        </div>
      )}

      {record.user_explanation && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Penjelasan Anda</p>
          <p className="text-sm text-navy">{record.user_explanation}</p>
          {record.proposed_clock_out && (
            <p className="text-xs text-navy/50 mt-1">Usulan jam pulang: {fmtTimeWIB(record.proposed_clock_out)}</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-navy/40">{label}</p>
      <p className="text-xl font-bold text-navy leading-tight mt-0.5">{value}</p>
    </div>
  )
}

// ── Explanation drawer (owner of an incomplete day) ──────────────────────────

function ExplainDrawer({ record, settings, onClose, onSubmit, isPending }: {
  record: Attendance | null
  settings: AttendanceSettings | undefined
  onClose: () => void
  onSubmit: (id: string, explanation: string, proposed?: string) => void
  isPending: boolean
}) {
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  // Reset the form whenever a different record is opened.
  const [lastId, setLastId] = useState<string | null>(null)
  if (record && record.id !== lastId) {
    setLastId(record.id)
    setText(record.user_explanation ?? '')
    setTime(record.proposed_clock_out ? fmtTimeWIB(record.proposed_clock_out) : (settings?.clock_out_time ?? ''))
  }

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      title="Kirim Penjelasan"
      subtitle={record ? `${fmtFullDate(record.date)} · masuk ${fmtTimeWIB(record.clock_in)} · pulang tidak tercatat` : ''}
      footer={record ? (
        <button
          className="btn-primary w-full justify-center disabled:opacity-40"
          disabled={!text.trim() || isPending}
          onClick={() => onSubmit(record.id, text.trim(), time || undefined)}
        >
          {isPending ? 'Mengirim…' : 'Kirim ke HR'}
        </button>
      ) : undefined}
    >
      {record && (
        <div className="space-y-4">
          <div>
            <label className="label">Apa yang terjadi?</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Contoh: Lupa clock-out, pulang jam 17:00 setelah meeting sore."
            />
          </div>
          <div>
            <label className="label">Jam pulang sebenarnya (WIB)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input" />
            <p className="text-xs text-navy/50 mt-1.5">
              HR akan memverifikasi sebelum jam ini diisi ke catatan Anda.
            </p>
          </div>
        </div>
      )}
    </Drawer>
  )
}

// ── HR review drawer ─────────────────────────────────────────────────────────

function ReviewDrawer({ record, settings, onClose, onApprove, onReject, isPending }: {
  record: Attendance | null
  settings: AttendanceSettings | undefined
  onClose: () => void
  onApprove: (id: string, time: string, note: string) => void
  onReject: (id: string, note: string) => void
  isPending: boolean
}) {
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [lastId, setLastId] = useState<string | null>(null)
  if (record && record.id !== lastId) {
    setLastId(record.id)
    // Prefill with the user's proposal, else the scheduled clock-out.
    setTime(record.proposed_clock_out ? fmtTimeWIB(record.proposed_clock_out) : (settings?.clock_out_time ?? '17:00'))
    setNote('')
  }

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      title={record?.user.full_name ?? ''}
      subtitle={record ? `${fmtFullDate(record.date)} · Clock-out tidak tercatat` : ''}
      footer={record ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40"
            disabled={!note.trim() || isPending}
            onClick={() => onReject(record.id, note.trim())}
          >
            <XCircle className="w-4 h-4" /> Tolak (absen)
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40"
            disabled={!note.trim() || !time || isPending}
            onClick={() => onApprove(record.id, time, note.trim())}
          >
            <CheckCircle2 className="w-4 h-4" /> Setujui
          </button>
        </div>
      ) : undefined}
    >
      {record && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Clock-in" value={fmtTimeWIB(record.clock_in)} />
            <StatBox label="Clock-out" value="—" />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Penjelasan pengguna</p>
            {record.user_explanation ? (
              <>
                <p className="text-sm text-navy">{record.user_explanation}</p>
                {record.proposed_clock_out && (
                  <p className="text-xs text-navy/50 mt-1">Usulan jam pulang: {fmtTimeWIB(record.proposed_clock_out)}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-navy/40 italic flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />Belum ada penjelasan — validasi langsung dengan yang bersangkutan.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border p-4 bg-navy-50/30 space-y-3">
            <div>
              <label className="label">Jam pulang yang diisi (WIB)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input" max={settings?.clock_out_time} />
              <p className="text-xs text-navy/50 mt-1.5">
                Maksimal jam pulang terjadwal ({settings?.clock_out_time ?? '17:00'}) — penyesuaian tidak memberi lembur.
              </p>
            </div>
            <div>
              <label className="label">Catatan keputusan (wajib)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="input resize-none"
                placeholder="Contoh: Konfirmasi via WA — lupa clock-out, pulang normal."
              />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

// ── Settings modal (HR) ──────────────────────────────────────────────────────

function SettingsModal({ open, settings, onClose, onSave, isPending }: {
  open: boolean
  settings: AttendanceSettings
  onClose: () => void
  onSave: (s: AttendanceSettings) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<AttendanceSettings>(settings)
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setWasOpen(true); setForm(settings) }
  if (!open && wasOpen) setWasOpen(false)

  return (
    <Modal open={open} onClose={onClose} title="Jadwal Presensi">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jam masuk (WIB)</label>
            <input type="time" value={form.clock_in_time} onChange={e => setForm(f => ({ ...f, clock_in_time: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Jam pulang (WIB)</label>
            <input type="time" value={form.clock_out_time} onChange={e => setForm(f => ({ ...f, clock_out_time: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Durasi kode (menit)</label>
            <input type="number" min={15} max={720} value={form.code_duration_minutes} onChange={e => setForm(f => ({ ...f, code_duration_minutes: Number(e.target.value) }))} className="input" />
          </div>
        </div>
        <p className="text-xs text-navy/50">
          Durasi kode sekaligus batas keterlambatan: masuk setelah jam masuk tercatat <span className="font-medium">terlambat</span>, dan clock-in ditutup pada jam masuk + durasi (misal 08:00 + 15 menit → tutup 08:15). Kode aktif mulai 30 menit sebelum jam masuk. Berlaku untuk semua pengguna mulai hari ini.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary">Batal</button>
          <button onClick={() => onSave(form)} disabled={isPending} className="btn-primary disabled:opacity-40">
            {isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
