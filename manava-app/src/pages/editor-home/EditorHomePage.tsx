import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, UserCheck, MessageSquare, User, Settings, Play, Square, Clock,
  ArrowRight, Star, TrendingUp,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockProjects, mockEditors, mockAttendance } from '../../data/mockData'
import { MY_EDITOR } from '../../data/myEditor'

const ACTIVE_PROJECT_STATUSES = ['awaiting_dp', 'in_progress', 'in_review', 'revision', 'disputed']
const CLOCK_KEY = 'manava_clockin'
const CURRENT_MONTH = '2026-06'

const FEATURES = [
  { to: '/projects', icon: Briefcase, label: 'Proyek' },
  { to: '/ess', icon: UserCheck, label: 'Mandiri' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profil' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function hms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function clockLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function EditorHomePage() {
  const me = mockEditors.find(e => e.editor_id === MY_EDITOR.editor_id)
  const myProjects = mockProjects.filter(
    p => p.editor_id === MY_EDITOR.editor_id && ACTIVE_PROJECT_STATUSES.includes(p.status)
  )

  const monthRecords = mockAttendance.filter(r => r.date.startsWith(CURRENT_MONTH))
  const presentDays = monthRecords.filter(r => r.status === 'present' || r.status === 'partial').length
  const leaveDays = monthRecords.filter(r => r.status === 'leave').length

  const stats = [
    { icon: Star, value: (me?.rating ?? 0).toFixed(1), label: 'Rating', tone: 'text-amber-500' },
    { icon: TrendingUp, value: `${me?.completion_rate ?? 0}%`, label: 'Penyelesaian', tone: 'text-blue-500' },
    { icon: Briefcase, value: String(myProjects.length), label: 'Proyek Aktif', tone: 'text-emerald-600' },
  ]

  // ── Attendance timer: counts from clock-in until clock-out ───────────────
  const [clockInAt, setClockInAt] = useState<number | null>(() => {
    const v = localStorage.getItem(CLOCK_KEY)
    return v ? Number(v) : null
  })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (clockInAt == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [clockInAt])

  function clockIn() {
    const t = Date.now()
    localStorage.setItem(CLOCK_KEY, String(t))
    setClockInAt(t)
    setNow(t)
  }
  function clockOut() {
    localStorage.removeItem(CLOCK_KEY)
    setClockInAt(null)
  }

  const working = clockInAt != null

  return (
    <div className="space-y-7">
      {/* 1 — Profile, greeting & KPI snapshot */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initials(MY_EDITOR.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-navy/50">{greeting()},</p>
            <h1 className="text-xl font-bold text-navy leading-tight truncate">{MY_EDITOR.full_name}</h1>
            <p className="text-xs text-navy/45">{MY_EDITOR.department}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 md:w-auto">
          {stats.map(s => (
            <div key={s.label} className="card !p-4 text-center md:min-w-[112px]">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.tone}`} />
              <p className="text-lg font-bold text-navy leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-navy/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Main: projects (left) + attendance (right) on desktop */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 2 — Active projects */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-navy">Proyek Aktif</h2>
            <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-navy/60 hover:text-navy transition-colors">
              Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {myProjects.length === 0 ? (
            <div className="card text-center py-12 text-navy/40">
              <Briefcase className="w-7 h-7 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada proyek aktif saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myProjects.map(p => (
                <div key={p.project_id} className="card flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-navy/40 shrink-0">{formatDate(p.created_at)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-navy text-sm leading-snug line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-navy/50 mt-1.5 line-clamp-2">{p.description}</p>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-navy/50 truncate">{p.client_name}</span>
                    <span className="text-sm font-bold text-navy shrink-0">{formatCurrency(p.project_value)}</span>
                  </div>
                  <Link
                    to={`/projects/${p.project_id}`}
                    className="btn-secondary justify-center text-sm py-2 mt-3"
                  >
                    Detail
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3 — Attendance with running timer + month summary */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-navy">Presensi Hari Ini</h2>
          <div className="rounded-[8px] border border-white/10 bg-navy text-white p-6">
            <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
              <Clock className="w-3.5 h-3.5" />
              {working ? 'Sedang bekerja' : 'Belum clock in'}
            </div>
            <p className="text-5xl font-bold tabular-nums leading-none">
              {hms(working ? now - clockInAt! : 0)}
            </p>
            <p className="text-xs text-white/50 mt-2.5">
              {working ? `Clock in pukul ${clockLabel(clockInAt!)}` : 'Mulai hitung waktu kerja Anda hari ini.'}
            </p>
            {working ? (
              <button
                onClick={clockOut}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                <Square className="w-4 h-4 fill-current" /> Clock Out
              </button>
            ) : (
              <button
                onClick={clockIn}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-6 py-3 rounded-xl text-sm transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Clock In
              </button>
            )}
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Bulan Ini</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
                <p className="text-lg font-bold text-emerald-600 leading-none">{presentDays}</p>
                <p className="text-xs text-navy/50 mt-1">Hari hadir</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2.5">
                <p className="text-lg font-bold text-blue-600 leading-none">{leaveDays}</p>
                <p className="text-xs text-navy/50 mt-1">Hari cuti</p>
              </div>
            </div>
            <Link to="/ess" className="btn-secondary w-full justify-center text-sm py-2 mt-3">
              Lihat absensi lengkap
            </Link>
          </div>
        </section>
      </div>

      {/* 4 — Feature shortcuts (circle cards) */}
      <section>
        <h2 className="text-base font-semibold text-navy mb-3">Fitur</h2>
        <div className="card">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-5">
            {FEATURES.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="group flex flex-col items-center gap-2 hover:no-underline">
                <span className="w-16 h-16 rounded-full bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(2,21,38,0.04)] flex items-center justify-center text-navy transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-black/10 group-hover:shadow-[0_14px_44px_-16px_rgba(2,21,38,0.18)] motion-reduce:group-hover:translate-y-0">
                  <Icon className="w-6 h-6" strokeWidth={1.75} />
                </span>
                <span className="text-xs font-medium text-navy/70 group-hover:text-navy transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
