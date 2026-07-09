import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, AlertTriangle, FileText, CreditCard, User, Clock, PackageCheck, X, Menu } from 'lucide-react'
import type { UserRole } from '../../types'
import { APPROVES_REQUESTS_FROM } from '../../lib/leaveRequests'
import { useLeaveRequests } from '../../hooks/queries/useLeaveRequests'
import { useWarnings } from '../../hooks/queries/useWarnings'
import { useApplications } from '../../hooks/queries/useApplications'
import { useAttendancePending, useAttendanceToday, useReviewQueue } from '../../hooks/queries/useAttendance'
import { fmtTimeWIB } from '../../lib/attendance'
import { formatDate } from '../../lib/utils'

// Single source of the page name shown in the top bar — pages no longer
// render their own big in-page header block.
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Pipeline Talent & Rekrutmen',
  '/projects': 'Proyek',
  '/contracts': 'Kontrak & Brief',
  '/payments': 'Manajemen Payroll & Budget',
  '/attendance': 'Presensi & Ketersediaan',
  '/performance': 'Indeks Kepuasan Klien & Evaluasi Editor',
  '/disputes': 'Penyelesaian Sengketa',
  '/chat': 'Chat Aplikasi',
  '/ess': 'Layanan Mandiri Karyawan',
  '/offboarding': 'Pengakhiran Kerja',
  '/deliverables': 'Integritas Hasil Kerja',
  '/audit': 'Jejak Audit',
  '/settings': 'Pengaturan',
  '/departments': 'Rekapitulasi Organisasi',
  '/team-dashboard': 'Manajemen Tim & Laporan Departemen',
  '/users': 'Pengguna & Role',
  '/system': 'Sistem & Enkripsi',
  '/warning': 'Peringatan Kerja',
  '/browse-editors': 'Cari Editor',
  '/profile': 'Profil',
  '/escrow': 'Escrow',
  '/emergency-release': 'Emergency Escrow Release',
  '/refund': 'Refund',
  '/bonus-accrual': 'Bonus Accrual',
  '/reconciliation': 'Rekonsiliasi',
  '/revenue-report': 'Laporan Pendapatan',
  '/payroll-disbursement': 'Payroll Disbursement',
}

type NotifIcon = 'alert' | 'contract' | 'payment' | 'user' | 'clock' | 'package'

interface Notification {
  id: string
  icon: NotifIcon
  title: string
  body: string
  time: string
  read: boolean
}

const ICON_MAP: Record<NotifIcon, typeof AlertTriangle> = {
  alert: AlertTriangle,
  contract: FileText,
  payment: CreditCard,
  user: User,
  clock: Clock,
  package: PackageCheck,
}

const ICON_COLORS: Record<NotifIcon, string> = {
  alert: 'bg-red-100 text-red-600',
  contract: 'bg-blue-100 text-blue-600',
  payment: 'bg-emerald-100 text-emerald-600',
  user: 'bg-purple-100 text-purple-600',
  clock: 'bg-amber-100 text-amber-600',
  package: 'bg-navy-50 text-navy',
}

interface HeaderProps {
  pathname: string
  role: UserRole
  onMenuClick: () => void
}

export function Header({ pathname, role, onMenuClick }: HeaderProps) {
  const title = pathname.startsWith('/projects/')
    ? 'Detail Proyek'
    : pathname.startsWith('/recruitment/')
    ? 'Detail Pelamar'
    : pathname === '/projects' && (role === 'client' || role === 'editor')
      ? 'Proyek Saya'
      : pathname === '/dashboard' && (role === 'client' || role === 'editor')
        ? 'Home'
        : pageTitles[pathname] ?? 'Manava'
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Real recruitment notifications for HR roles: applications with status
  // "new" in the DB become one aggregated "N lamaran baru" entry.
  const seesApplications = role === 'hr_admin' || role === 'superadmin'
  const applicationsQuery = useApplications(seesApplications)
  const [readAppNotif, setReadAppNotif] = useState(false)
  const applicationNotifs: Notification[] = useMemo(() => {
    const fresh = (applicationsQuery.data ?? []).filter(a => a.status === 'new')
    if (!seesApplications || fresh.length === 0) return []
    return [{
      id: 'applications-new',
      icon: 'user' as const,
      title: `${fresh.length} lamaran baru`,
      body: 'Lamaran menunggu tinjauan Anda di pipeline rekrutmen.',
      time: 'Pipeline ATS',
      read: readAppNotif,
    }]
  }, [seesApplications, applicationsQuery.data, readAppNotif])

  // Real leave-request notifications for approver roles, derived from the
  // shared query cache: every pending request this role can action becomes a
  // notification. Read-state is session-local (ids in a Set) since the queue
  // itself lives in the DB.
  const approvableRoles = useMemo(() => APPROVES_REQUESTS_FROM[role] ?? [], [role])
  const leaveQuery = useLeaveRequests(approvableRoles.length > 0)
  const [readLeaveIds, setReadLeaveIds] = useState<ReadonlySet<string>>(new Set())
  const leaveNotifs: Notification[] = useMemo(
    () =>
      (leaveQuery.data ?? [])
        .filter(l => l.status === 'pending' && approvableRoles.includes(l.requester_role))
        .map(l => ({
          id: `leave-${l.leave_id}`,
          icon: 'clock' as const,
          title: 'Permohonan cuti menunggu persetujuan',
          body: `${l.requester_name} mengajukan ${l.leave_type === 'cuti' ? 'cuti tahunan' : 'izin'} ${formatDate(l.start_date)} – ${formatDate(l.end_date)}`,
          time: `Diajukan ${formatDate(l.created_at)}`,
          read: readLeaveIds.has(l.leave_id),
        })),
    [leaveQuery.data, approvableRoles, readLeaveIds],
  )

  // Real warning notifications for warning recipients: the API already scopes
  // GET /warnings to the logged-in user for these roles, so every active
  // warning in the list is one addressed to me.
  const receivesWarnings = role === 'editor' || role === 'admin_manager'
  const warningsQuery = useWarnings(receivesWarnings)
  const [readWarningIds, setReadWarningIds] = useState<ReadonlySet<string>>(new Set())
  const warningNotifs: Notification[] = useMemo(
    () =>
      (receivesWarnings ? warningsQuery.data ?? [] : [])
        .filter(w => w.status === 'aktif')
        .map(w => ({
          id: `warning-${w.id}`,
          icon: 'alert' as const,
          title: `Peringatan kerja (${w.severity}) dari HR`,
          body: w.reason,
          time: `Diterbitkan ${formatDate(w.issuedAt)} · oleh ${w.issuedBy}`,
          read: readWarningIds.has(w.id),
        })),
    [warningsQuery.data, readWarningIds, receivesWarnings],
  )

  // Attendance notifications. Editors / Admin Managers see their own
  // forgotten clock-outs (the API scopes review=pending to them); HR sees a
  // single aggregated "N presensi perlu tinjauan" from the review queue.
  const isHRRole = role === 'hr_admin' || role === 'superadmin'
  const clocksIn = role === 'editor' || role === 'admin_manager'

  // Presensi session codes: when HR opens presensi (masuk/keluar), Admin
  // Managers and Editors receive the code here and type it back to clock
  // in/out. The notification lives as long as the session is active.
  const sessionsQuery = useAttendanceToday(clocksIn)
  const [readSessionIds, setReadSessionIds] = useState<ReadonlySet<string>>(new Set())
  const sessionNotifs: Notification[] = useMemo(() => {
    const s = sessionsQuery.data?.sessions
    if (!clocksIn || !s) return []
    return [s.masuk, s.keluar]
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map(x => ({
        id: `session-${x.id}`,
        icon: 'clock' as const,
        title: `${x.type === 'masuk' ? 'Presensi masuk' : 'Presensi keluar'} dibuka — kode ${x.code}`,
        body: `Isi kode ${x.code} di halaman Presensi untuk mencatat ${x.type === 'masuk' ? 'clock-in' : 'clock-out'} Anda.`,
        time: `Berlaku s.d. ${fmtTimeWIB(x.expires_at)} WIB`,
        read: readSessionIds.has(x.id),
      }))
  }, [clocksIn, sessionsQuery.data?.sessions, readSessionIds])
  const myPendingQuery = useAttendancePending(clocksIn)
  const reviewQueueQuery = useReviewQueue(isHRRole)
  const [readAttendanceIds, setReadAttendanceIds] = useState<ReadonlySet<string>>(new Set())
  const attendanceNotifs: Notification[] = useMemo(() => {
    if (clocksIn) {
      return (myPendingQuery.data ?? []).map(r => ({
        id: `attendance-${r.id}`,
        icon: 'clock' as const,
        title: 'Anda lupa clock-out',
        body: `Presensi ${formatDate(r.date)} (masuk ${fmtTimeWIB(r.clock_in)}) belum lengkap — kirim penjelasan agar HR bisa meninjau.`,
        time: `Menunggu tinjauan HR`,
        read: readAttendanceIds.has(r.id),
      }))
    }
    const queue = reviewQueueQuery.data ?? []
    if (!isHRRole || queue.length === 0) return []
    return [{
      id: 'attendance-queue',
      icon: 'clock' as const,
      title: `${queue.length} presensi perlu tinjauan`,
      body: 'Clock-out yang terlupa menunggu keputusan Anda (setujui / tolak).',
      time: 'Antrian tinjauan presensi',
      read: readAttendanceIds.has('queue'),
    }]
  }, [clocksIn, isHRRole, myPendingQuery.data, reviewQueueQuery.data, readAttendanceIds])

  const allNotifs = [...sessionNotifs, ...warningNotifs, ...attendanceNotifs, ...leaveNotifs, ...applicationNotifs]
  const unread = allNotifs.filter(n => !n.read).length
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Every notification is DB-derived; clicking marks it read (session-local)
  // and navigates to the page where it can be actioned.
  function handleNotifClick(n: Notification) {
    if (n.id.startsWith('leave-')) {
      const leaveId = n.id.slice('leave-'.length)
      setReadLeaveIds(prev => new Set(prev).add(leaveId))
      setOpen(false)
      navigate('/attendance')
      return
    }
    if (n.id.startsWith('session-')) {
      const sessionId = n.id.slice('session-'.length)
      setReadSessionIds(prev => new Set(prev).add(sessionId))
      setOpen(false)
      navigate('/attendance')
      return
    }
    if (n.id.startsWith('attendance')) {
      const key = n.id === 'attendance-queue' ? 'queue' : n.id.slice('attendance-'.length)
      setReadAttendanceIds(prev => new Set(prev).add(key))
      setOpen(false)
      navigate('/attendance')
      return
    }
    if (n.id.startsWith('warning-')) {
      const warningId = n.id.slice('warning-'.length)
      setReadWarningIds(prev => new Set(prev).add(warningId))
      setOpen(false)
      navigate('/warning')
      return
    }
    if (n.id === 'applications-new') {
      setReadAppNotif(true)
      setOpen(false)
      navigate('/recruitment')
    }
  }

  function markAllRead() {
    setReadAppNotif(true)
    setReadLeaveIds(new Set(leaveNotifs.map(n => n.id.slice('leave-'.length))))
    setReadWarningIds(new Set(warningNotifs.map(n => n.id.slice('warning-'.length))))
    setReadAttendanceIds(new Set(attendanceNotifs.map(n => (n.id === 'attendance-queue' ? 'queue' : n.id.slice('attendance-'.length)))))
    setReadSessionIds(new Set(sessionNotifs.map(n => n.id.slice('session-'.length))))
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-navy">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="relative p-2 rounded-xl hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                {unread}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-border z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">Notifikasi</span>
                  {unread > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">{unread} baru</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-navy/50 hover:text-navy transition-colors px-2 py-1 rounded-lg hover:bg-navy-50">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Tandai semua dibaca
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-navy/30 hover:text-navy hover:bg-navy-50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-border">
                {allNotifs.map(n => {
                  const Icon = ICON_MAP[n.icon]
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary-200 transition-colors ${!n.read ? 'bg-navy-50/40' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${ICON_COLORS[n.icon]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-navy' : 'font-medium text-navy/80'}`}>{n.title}</p>
                          {!n.read && <span className="w-2 h-2 bg-navy rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-navy/50 mt-0.5 leading-snug">{n.body}</p>
                        <p className="text-xs text-navy/30 mt-1">{n.time}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border bg-primary-200/60">
                <p className="text-xs text-center text-navy/40">
                  {allNotifs.length} notifikasi
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
