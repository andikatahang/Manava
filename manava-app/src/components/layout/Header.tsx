import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, MessageSquare, CheckCheck, AlertTriangle, FileText, CreditCard, User, Clock, PackageCheck, X, Menu } from 'lucide-react'
import type { UserRole } from '../../types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Rekrutmen & Onboarding',
  '/projects': 'Proyek',
  '/contracts': 'Kontrak & Brief',
  '/payments': 'Escrow & Pembayaran',
  '/attendance': 'Absensi, Cuti & Penggajian',
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
    { id: 'n5', icon: 'clock', title: 'Permohonan cuti', body: 'Ahmad Rizki mengajukan cuti 2 hari mulai Sen 30 Jun', time: '6 jam lalu', read: true },
  ],
  admin_manager: [
    { id: 'n1', icon: 'user', title: '3 pelamar baru', body: 'Posisi Senior Photo Retoucher menerima 3 lamaran hari ini', time: '1 jam lalu', read: false },
    { id: 'n2', icon: 'clock', title: 'Permohonan cuti', body: 'Ahmad Rizki mengajukan cuti 2 hari mulai Sen 30 Jun', time: '2 jam lalu', read: false },
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
      : pageTitles[pathname] ?? 'Manava'
  const [open, setOpen] = useState(false)
  const showChat = role === 'editor' || role === 'superadmin'
  const [notifs, setNotifs] = useState<Notification[]>(() => NOTIFS_BY_ROLE[role] ?? [])
  const unread = notifs.filter(n => !n.read).length
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

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
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
                {notifs.map(n => {
                  const Icon = ICON_MAP[n.icon]
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
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
                  {notifs.length} notifikasi · Hanya sesi ini
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
