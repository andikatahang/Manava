// DB-backed attendance view (the "Presensi" tab of AttendancePage).
// HR opens presensi sessions manually ("Buka Presensi" → masuk/keluar +
// durasi); the code is delivered to Admin Managers & Editors via the in-app
// notification and must be typed for both clock-in and clock-out.
// HR additionally gets the session panel, the records table (semua pengguna),
// and the "Perlu Tinjauan" queue for forgotten clock-outs.

import { useMemo, useState } from 'react'
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Copy, KeyRound, LogIn, LogOut, Search, Settings2, XCircle,
} from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Modal } from '../../components/ui/Modal'
import type { UserRole, LeaveRequest } from '../../types'
import {
  effectiveClockOut, fmtTimeWIB,
  type Attendance, type AttendanceSession, type AttendanceSessionType,
  type AttendanceSettings, type AttendanceStatus,
} from '../../lib/attendance'
import {
  useAttendanceMutations, useAttendancePending, useAttendanceRecords,
  useAttendanceToday, useReviewQueue,
} from '../../hooks/queries/useAttendance'

export const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  late:       'bg-amber-100  text-amber-700  border-amber-200',
  incomplete: 'bg-orange-100 text-orange-700 border-orange-200',
  absent:     'bg-red-100    text-red-700    border-red-200',
  leave:      'bg-blue-100   text-blue-700   border-blue-200',
  partial:    'bg-gray-100   text-gray-600   border-gray-200',
}
export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Hadir', late: 'Terlambat', incomplete: 'Perlu Tinjauan',
  absent: 'Absen', leave: 'Cuti', partial: 'Sebagian',
}
const REVIEW_LABEL = {
  pending: 'Menunggu tinjauan HR',
  approved: 'Disetujui HR',
  rejected: 'Ditolak HR',
} as const

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin', hr_admin: 'HR Admin',
  admin_manager: 'Admin Manajer', editor: 'Editor',
}

export const SESSION_LABEL: Record<AttendanceSessionType, string> = {
  masuk: 'Presensi Masuk', keluar: 'Presensi Keluar',
}

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
function fmtTableDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function AttendanceTab({ role, leaves, flash }: {
  role: UserRole
  leaves: LeaveRequest[]
  flash: (msg: string) => void
}) {
  const isHR = HR_ROLES.includes(role)
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const todayQuery = useAttendanceToday()
  const myRecords = useAttendanceRecords({ month, user_id: 'me' }, !isHR)
  const allRecords = useAttendanceRecords({}, isHR) // HR: every user, every day
  const myPending = useAttendancePending()
  const queueQuery = useReviewQueue(isHR)
  const mutations = useAttendanceMutations()

  const [dayDetail, setDayDetail] = useState<Attendance | null>(null)
  const [explainTarget, setExplainTarget] = useState<Attendance | null>(null)
  const [reviewTarget, setReviewTarget] = useState<Attendance | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openPresensiOpen, setOpenPresensiOpen] = useState(false)

  const settings = todayQuery.data?.settings
  const sessions = todayQuery.data?.sessions
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
      {/* HR action row — buka presensi + jadwal (referensi: tombol kanan-atas) */}
      {isHR && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="w-4 h-4" /> Atur Jadwal
          </button>
          <button className="btn-primary text-sm" onClick={() => setOpenPresensiOpen(true)}>
            <KeyRound className="w-4 h-4" /> Buka Presensi
          </button>
        </div>
      )}

      {isHR && (sessions?.masuk || sessions?.keluar) && (
        <ActiveSessionPanel sessions={sessions} />
      )}

      <TodayCard
        record={todayQuery.data?.record ?? null}
        settings={settings}
        sessions={sessions}
        today={today}
        mutations={mutations}
      />

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

      {/* HR: tabel presensi semua pengguna (desain referensi UNISYS) */}
      {isHR && (
        <RecordsTable records={allRecords.data ?? []} onOpen={setDayDetail} />
      )}

      {!isHR && <StatStrip records={myRecords.data ?? []} />}

      {!isHR && (
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
      )}

      {/* Day detail — full transparency: originals + HR adjustments */}
      <Drawer
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        title={dayDetail ? (isHR ? dayDetail.user.full_name : fmtFullDate(dayDetail.date)) : ''}
        subtitle={dayDetail ? `${fmtFullDate(dayDetail.date)} · ${STATUS_LABEL[dayDetail.status]}` : ''}
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
        <OpenPresensiModal
          open={openPresensiOpen}
          defaultDuration={settings.code_duration_minutes}
          onClose={() => setOpenPresensiOpen(false)}
          onSubmit={(type, duration) =>
            mutations.openSession.mutate(
              { type, duration_minutes: duration },
              {
                onSuccess: s => {
                  setOpenPresensiOpen(false)
                  flash(`${SESSION_LABEL[s.type]} dibuka — kode ${s.code} berlaku s.d. ${fmtTimeWIB(s.expires_at)} WIB.`)
                },
                onError: e => flash(e instanceof Error ? e.message : 'Gagal membuka presensi.'),
              },
            )
          }
          isPending={mutations.openSession.isPending}
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

function TodayCard({ record, settings, sessions, today, mutations }: {
  record: Attendance | null
  settings: AttendanceSettings | undefined
  sessions: { masuk: AttendanceSession | null; keluar: AttendanceSession | null } | undefined
  today: string
  mutations: ReturnType<typeof useAttendanceMutations>
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hasIn = !!record?.clock_in
  const hasOut = !!record?.clock_out
  const masuk = sessions?.masuk ?? null
  const keluar = sessions?.keluar ?? null

  function handleClockIn() {
    if (!code.trim()) { setError('Masukkan kode presensi dari notifikasi.'); return }
    setError(null)
    mutations.clockIn.mutate(code.trim().toUpperCase(), {
      onSuccess: () => setCode(''),
      onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-in.'),
    })
  }
  function handleClockOut() {
    if (!code.trim()) { setError('Masukkan kode presensi dari notifikasi.'); return }
    setError(null)
    mutations.clockOut.mutate(code.trim().toUpperCase(), {
      onSuccess: () => setCode(''),
      onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-out.'),
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
        {!hasIn && (masuk ? (
          <p className="text-xs text-navy/50 mt-2">
            Presensi masuk dibuka — kode berlaku s.d.{' '}
            <span className="font-medium text-navy">{fmtTimeWIB(masuk.expires_at)}</span> WIB
            {settings && <> · masuk setelah <span className="font-medium text-navy">{settings.clock_in_time}</span> tercatat terlambat</>}.
          </p>
        ) : (
          <p className="text-xs text-navy/50 mt-2">
            Presensi masuk belum dibuka oleh HR Admin — kode akan dikirim lewat notifikasi aplikasi.
          </p>
        ))}
        {hasIn && !hasOut && (keluar ? (
          <p className="text-xs text-navy/50 mt-2">
            Presensi keluar dibuka — kode berlaku s.d.{' '}
            <span className="font-medium text-navy">{fmtTimeWIB(keluar.expires_at)}</span> WIB.
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {record?.status === 'late' ? 'Anda masuk terlambat hari ini. ' : ''}
            Presensi keluar belum dibuka HR — tunggu notifikasi kode sebelum pulang.
          </p>
        ))}
        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!hasIn && masuk && (
          <>
            <CodeInput code={code} onChange={setCode} onEnter={handleClockIn} />
            <button className="btn-primary" onClick={handleClockIn} disabled={mutations.clockIn.isPending}>
              <LogIn className="w-4 h-4" />{mutations.clockIn.isPending ? 'Memeriksa…' : 'Masuk'}
            </button>
          </>
        )}
        {!hasIn && !masuk && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-navy/50 bg-navy/[0.04] border border-border px-4 py-2.5 rounded-xl">
            <Clock className="w-4 h-4" />Menunggu presensi dibuka
          </span>
        )}
        {hasIn && !hasOut && keluar && (
          <>
            <CodeInput code={code} onChange={setCode} onEnter={handleClockOut} />
            <button className="btn-primary" onClick={handleClockOut} disabled={mutations.clockOut.isPending}>
              <LogOut className="w-4 h-4" />{mutations.clockOut.isPending ? 'Menyimpan…' : 'Keluar'}
            </button>
          </>
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

function CodeInput({ code, onChange, onEnter }: {
  code: string
  onChange: (v: string) => void
  onEnter: () => void
}) {
  return (
    <div className="relative">
      <KeyRound className="w-3.5 h-3.5 text-navy/30 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        value={code}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
        placeholder="Kode"
        maxLength={6}
        aria-label="Kode presensi"
        className="input w-28 pl-9 font-semibold tracking-[0.15em] uppercase placeholder:tracking-normal placeholder:font-normal"
      />
    </div>
  )
}

// ── HR active session panel ──────────────────────────────────────────────────

export function ActiveSessionPanel({ sessions }: {
  sessions: { masuk: AttendanceSession | null; keluar: AttendanceSession | null }
}) {
  const active = [sessions.masuk, sessions.keluar].filter((s): s is AttendanceSession => !!s)
  return (
    <div className="rounded-2xl border border-navy bg-navy text-white p-5 grid gap-4 sm:grid-cols-2">
      {active.map(s => <SessionCell key={s.id} session={s} />)}
    </div>
  )
}

function SessionCell({ session }: { session: AttendanceSession }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-white/50 mb-1">
        {SESSION_LABEL[session.type]} · aktif
      </p>
      <div className="flex items-center gap-3">
        <p className="text-3xl font-bold tracking-[0.3em] tabular-nums leading-none">{session.code}</p>
        <button
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label={`Salin kode ${SESSION_LABEL[session.type]}`}
          onClick={() => {
            navigator.clipboard?.writeText(session.code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }).catch(() => {})
          }}
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-white/60 mt-2">
        Berlaku s.d. {fmtTimeWIB(session.expires_at)} WIB ({session.duration_minutes} menit) — kode terkirim ke Admin Manajer & Editor via notifikasi.
      </p>
    </div>
  )
}

// ── HR "Buka Presensi" popup ─────────────────────────────────────────────────

export function OpenPresensiModal({ open, defaultDuration, onClose, onSubmit, isPending }: {
  open: boolean
  defaultDuration: number
  onClose: () => void
  onSubmit: (type: AttendanceSessionType, durationMinutes: number) => void
  isPending: boolean
}) {
  const [type, setType] = useState<AttendanceSessionType>('masuk')
  const [duration, setDuration] = useState(defaultDuration)
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setWasOpen(true); setType('masuk'); setDuration(defaultDuration) }
  if (!open && wasOpen) setWasOpen(false)

  const durationValid = Number.isInteger(duration) && duration >= 5 && duration <= 720

  return (
    <Modal open={open} onClose={onClose} title="Buka Presensi">
      <div className="space-y-4">
        <div>
          <label className="label">Jenis presensi</label>
          <div className="grid grid-cols-2 gap-2">
            {([['masuk', LogIn], ['keluar', LogOut]] as const).map(([v, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`p-3 rounded-xl border text-left transition-all ${type === v ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30'}`}
              >
                <p className={`text-sm font-semibold flex items-center gap-2 ${type === v ? 'text-navy' : 'text-navy/60'}`}>
                  <Icon className="w-4 h-4" />{SESSION_LABEL[v]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Durasi masa presensi (menit)</label>
          <input
            type="number"
            min={5}
            max={720}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="input"
          />
          <div className="flex gap-1.5 mt-2">
            {[5, 15, 30, 60].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setDuration(m)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${duration === m ? 'bg-navy text-white' : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e8e8e8]'}`}
              >
                {m} mnt
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-navy/50">
          Kode dibuat otomatis dan dikirim ke semua Admin Manajer &amp; Editor melalui notifikasi aplikasi.
          Setiap pengguna wajib mengisi kode ini sebelum presensi {type === 'masuk' ? 'masuk' : 'keluar'}.
          Hanya satu kode berlaku pada satu waktu — membuka presensi baru menutup kode yang masih aktif,
          termasuk kode {type === 'masuk' ? 'keluar' : 'masuk'} yang belum kedaluwarsa.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary">Batal</button>
          <button
            onClick={() => onSubmit(type, duration)}
            disabled={!durationValid || isPending}
            className="btn-primary disabled:opacity-40"
          >
            <KeyRound className="w-4 h-4" />{isPending ? 'Membuka…' : 'Buka Presensi'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── HR records table (desain referensi: Tampilkan N · cari · baris belang) ───

const PAGE_SIZES = [10, 25, 50] as const

function RecordsTable({ records, onOpen }: {
  records: Attendance[]
  onOpen: (r: Attendance) => void
}) {
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(r =>
      r.user.full_name.toLowerCase().includes(q)
      || STATUS_LABEL[r.status].toLowerCase().includes(q)
      || (ROLE_LABEL[r.user.role] ?? r.user.role).toLowerCase().includes(q)
      || fmtTableDate(r.date).toLowerCase().includes(q),
    )
  }, [records, query])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return (
    <section className="rounded-[12px] border border-black/[0.06] bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-black/[0.06]">
        <h3 className="font-semibold text-navy">Riwayat Presensi</h3>
        <p className="text-xs text-navy/50 mt-0.5">Seluruh catatan presensi pengguna — klik baris untuk detail.</p>
      </div>

      {/* Controls: Tampilkan N data (kiri) · pencarian (kanan) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <label className="flex items-center gap-2 text-sm text-navy/60">
          Tampilkan
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="input w-auto py-1.5 px-2 text-sm"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          data
        </label>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-navy/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Cari nama, peran, status…"
            aria-label="Cari riwayat presensi"
            className="input w-full pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-black/[0.06] bg-white text-left text-[11px] font-semibold uppercase tracking-wider text-navy/40">
              <th className="px-5 py-3 font-semibold w-12">No.</th>
              <th className="px-3 py-3 font-semibold">Nama</th>
              <th className="px-3 py-3 font-semibold">Peran</th>
              <th className="px-3 py-3 font-semibold">Tanggal</th>
              <th className="px-3 py-3 font-semibold">Jam Masuk</th>
              <th className="px-3 py-3 font-semibold">Jam Keluar</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-navy/40">
                  {query ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Belum ada catatan presensi.'}
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const out = effectiveClockOut(r)
              return (
                <tr
                  key={r.id}
                  onClick={() => onOpen(r)}
                  className={`cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-navy/[0.04] ${i % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'}`}
                >
                  <td className="px-5 py-3 text-navy/50 tabular-nums">{start + i + 1}</td>
                  <td className="px-3 py-3 font-medium text-navy whitespace-nowrap">{r.user.full_name}</td>
                  <td className="px-3 py-3 text-navy/60 whitespace-nowrap">{ROLE_LABEL[r.user.role] ?? r.user.role}</td>
                  <td className="px-3 py-3 text-navy/60 whitespace-nowrap">{fmtTableDate(r.date)}</td>
                  <td className="px-3 py-3 text-navy tabular-nums">{fmtTimeWIB(r.clock_in)}</td>
                  <td className="px-3 py-3 text-navy tabular-nums">
                    {out ? `${fmtTimeWIB(out)}${!r.clock_out ? '*' : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: rentang + navigasi halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-black/[0.06]">
        <p className="text-xs text-navy/50">
          {total === 0
            ? 'Menampilkan 0 data'
            : `Menampilkan ${start + 1} sampai ${Math.min(start + pageSize, total)} dari ${total} data`}
          {records.some(r => !r.clock_out && r.adjusted_clock_out) && ' · * jam pulang diisi HR'}
        </p>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg border border-border hover:bg-navy-50 transition-colors disabled:opacity-30"
            aria-label="Halaman sebelumnya"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 text-navy/60" />
          </button>
          <span className="text-xs text-navy/60 px-2 tabular-nums">{safePage} / {pageCount}</span>
          <button
            className="p-1.5 rounded-lg border border-border hover:bg-navy-50 transition-colors disabled:opacity-30"
            aria-label="Halaman berikutnya"
            disabled={safePage >= pageCount}
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
          >
            <ChevronRight className="w-4 h-4 text-navy/60" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ── HR review queue ──────────────────────────────────────────────────────────

export function ReviewQueueCard({ queue, onOpen }: { queue: Attendance[]; onOpen: (r: Attendance) => void }) {
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

export function StatStrip({ records }: { records: Attendance[] }) {
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

export function CalendarCard({ month, onMonthChange, recordMap, leaves, today, onOpenDay }: {
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

export function DayDetailBody({ record }: { record: Attendance }) {
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

export function ReviewDrawer({ record, settings, onClose, onApprove, onReject, isPending }: {
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

export function SettingsModal({ open, settings, onClose, onSave, isPending }: {
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
            <label className="label">Durasi default (menit)</label>
            <input type="number" min={15} max={720} value={form.code_duration_minutes} onChange={e => setForm(f => ({ ...f, code_duration_minutes: Number(e.target.value) }))} className="input" />
          </div>
        </div>
        <p className="text-xs text-navy/50">
          Jam masuk menjadi acuan keterlambatan: clock-in setelah jam ini tercatat{' '}
          <span className="font-medium">terlambat</span>. Jam pulang membatasi pengisian jam pulang oleh HR
          saat tinjauan. Durasi default mengisi otomatis kolom durasi pada popup Buka Presensi.
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
