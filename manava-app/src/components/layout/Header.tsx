import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, CheckCheck, AlertTriangle, FileText, CreditCard, User, Clock, PackageCheck, X, Menu } from 'lucide-react'
import type { UserRole } from '../../types'
import { APPROVES_REQUESTS_FROM } from '../../lib/leaveRequests'
import { useLeaveRequests } from '../../hooks/queries/useLeaveRequests'
import { useWarnings } from '../../hooks/queries/useWarnings'
import { formatDate } from '../../lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Rekrutmen & Onboarding',
  '/projects': 'Proyek',
  '/contracts': 'Kontrak & Brief',
  '/payments': 'Escrow & Pembayaran',
  '/attendance': 'Presensi, Cuti & Penggajian',
  '/performance': 'KPI Kinerja',
  '/disputes': 'Penyelesaian Sengketa',
  '/chat': 'Chat Aplikasi',
  '/ess': 'Layanan Mandiri Karyawan',
  '/offboarding': 'Pengakhiran Kerja',
  '/deliverables': 'Integritas Hasil Kerja',
  '/audit': 'Jejak Audit',
  '/settings': 'Pengaturan',
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

const NOTIFS_BY_ROLE: Record<UserRole, Notification[]> = {
  superadmin: [
    { id: 'n1', icon: 'alert', title: 'Sengketa dieskalasi', body: 'Sengketa Proyek #PRJ-005 melewati SLA — sisa 2 jam', time: '5 mnt lalu', read: false },
    { id: 'n2', icon: 'user', title: '3 pelamar baru', body: 'Posisi Senior Photo Retoucher menerima 3 lamaran hari ini', time: '1 jam lalu', read: false },
    { id: 'n3', icon: 'payment', title: 'Pencairan escrow tertunda', body: 'IDR 12.500.000 siap dicairkan — proyek #PRJ-002 selesai', time: '2 jam lalu', read: false },
    { id: 'n4', icon: 'contract', title: 'Kontrak ditandatangani', body: 'Klien Artisan Studio menandatangani Brief #BRF-009', time: '4 jam lalu', read: true },
  ],
  hr_admin: [
    { id: 'n1', icon: 'user', title: '5 pelamar baru', body: 'Posisi Video Editor — E-commerce menerima 5 lamaran hari ini', time: '20 mnt lalu', read: false },
    { id: 'n2', icon: 'clock', title: 'Cutoff absensi hari ini', body: 'Kunci rekap kehadiran Juni — 18:00 WIB', time: '2 jam lalu', read: false },
    { id: 'n3', icon: 'payment', title: 'Batch payslip siap publish', body: '12 payslip menunggu konfirmasi Anda sebelum disbursement Keuangan', time: '4 jam lalu', read: true },
    { id: 'n4', icon: 'user', title: 'Offer accepted', body: 'Maya Putri menerima offer — DSS menunggu konfirmasi departemen', time: '1 hr lalu', read: true },
  ],
  admin_manager: [
    { id: 'n1', icon: 'user', title: '3 pelamar baru', body: 'Posisi Senior Photo Retoucher menerima 3 lamaran hari ini', time: '1 jam lalu', read: false },
    { id: 'n3', icon: 'alert', title: 'Peringatan KPI', body: 'Tingkat penyelesaian Budi Santoso turun ke 72% bulan ini', time: '5 jam lalu', read: true },
    { id: 'n4', icon: 'user', title: 'Pengakhiran kerja dimulai', body: 'Checklist pengakhiran kerja Diana Permata menunggu persetujuan Anda', time: '1 hr lalu', read: true },
  ],
  editor: [
    { id: 'n1', icon: 'contract', title: 'Permintaan revisi baru', body: 'Klien meminta revisi major pada Campaign Pack #PRJ-003', time: '15 mnt lalu', read: false },
    { id: 'n2', icon: 'package', title: 'Umpan balik hasil kerja', body: 'Kiriman v3 Anda mendapat rating klien 4.8 ★', time: '2 jam lalu', read: false },
    { id: 'n3', icon: 'clock', title: 'Slip gaji siap', body: 'Slip gaji Juni 2026 Anda siap diunduh', time: '1 hr lalu', read: true },
    { id: 'n4', icon: 'contract', title: 'Brief ditugaskan', body: 'Brief proyek baru #BRF-012 ditugaskan — tenggat 10 Jul', time: '2 hr lalu', read: true },
  ],
  client: [
    { id: 'n1', icon: 'package', title: 'Hasil kerja siap', body: 'v3 untuk Campaign Pack siap ditinjau', time: '30 mnt lalu', read: false },
    { id: 'n2', icon: 'payment', title: 'Perlu top-up escrow', body: 'Revisi major disetujui — perlu top-up IDR 350.000', time: '3 jam lalu', read: false },
    { id: 'n3', icon: 'contract', title: 'Revisi diklasifikasi', body: 'Permintaan revisi Anda diklasifikasi sebagai MINOR — gratis', time: '1 hr lalu', read: true },
    { id: 'n4', icon: 'payment', title: 'Pembayaran diterima', body: 'Pembayaran DP Anda sebesar IDR 6.250.000 telah dikonfirmasi', time: '3 hr lalu', read: true },
  ],
  mediator: [
    { id: 'n1', icon: 'alert', title: 'Sengketa baru ditugaskan', body: 'Sengketa #DSP-003 ditugaskan ke Anda — SLA: 48 jam', time: '1 jam lalu', read: false },
    { id: 'n2', icon: 'alert', title: 'Peringatan SLA', body: 'Sengketa #DSP-001 — sisa SLA hanya 2 jam', time: '2 jam lalu', read: false },
    { id: 'n3', icon: 'contract', title: 'Bukti dikirim', body: 'Klien mengunggah 3 berkas baru ke Sengketa #DSP-002', time: '4 jam lalu', read: true },
  ],
  finance: [
    { id: 'n1', icon: 'payment', title: 'Pencairan escrow siap', body: 'IDR 12.500.000 siap dicairkan — proyek #PRJ-002', time: '30 mnt lalu', read: false },
    { id: 'n2', icon: 'payment', title: 'Batch penggajian jatuh tempo', body: 'Batch penggajian Juni 2026 menunggu persetujuan — 12 editor', time: '2 jam lalu', read: false },
    { id: 'n3', icon: 'payment', title: 'DP diterima', body: 'DP Klien Artisan Studio IDR 6.250.000 dikonfirmasi', time: '1 hr lalu', read: true },
    { id: 'n4', icon: 'clock', title: 'Rekonsiliasi bulanan', body: 'Laporan rekonsiliasi escrow ↔ penggajian Mei 2026 siap', time: '3 hr lalu', read: true },
  ],
}

interface HeaderProps {
  pathname: string
  role: UserRole
  onMenuClick: () => void
}

export function Header({ pathname, role, onMenuClick }: HeaderProps) {
  const title = pathname.startsWith('/projects/')
    ? 'Detail Proyek'
    : pathname === '/projects' && (role === 'client' || role === 'editor')
      ? 'Proyek Saya'
      : pathname === '/dashboard' && (role === 'client' || role === 'editor')
        ? 'Home'
        : pageTitles[pathname] ?? 'Manava'
  const [open, setOpen] = useState(false)
  const showChat = role === 'editor' || role === 'superadmin'
  const [notifs, setNotifs] = useState<Notification[]>(() => NOTIFS_BY_ROLE[role] ?? [])
  const navigate = useNavigate()

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

  const allNotifs = [...warningNotifs, ...leaveNotifs, ...notifs]
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

  // Leave notifications navigate to the approval queue; static ones just
  // toggle their read flag.
  function handleNotifClick(n: Notification) {
    if (n.id.startsWith('leave-')) {
      const leaveId = n.id.slice('leave-'.length)
      setReadLeaveIds(prev => new Set(prev).add(leaveId))
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
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setReadLeaveIds(new Set(leaveNotifs.map(n => n.id.slice('leave-'.length))))
    setReadWarningIds(new Set(warningNotifs.map(n => n.id.slice('warning-'.length))))
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

        {/* Quick chat — to the right of the bell */}
        {showChat && (
          <Link
            to="/chat"
            className="p-2 rounded-xl hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors"
            aria-label="Buka chat"
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        )}
      </div>
    </header>
  )
}
