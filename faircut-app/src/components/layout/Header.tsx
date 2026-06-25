import { useState, useRef, useEffect } from 'react'
import { Bell, Search, CheckCheck, AlertTriangle, FileText, CreditCard, User, Clock, PackageCheck, X } from 'lucide-react'
import type { UserRole } from '../../types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Recruitment & Onboarding',
  '/projects': 'Projects',
  '/contracts': 'Contracts & Briefs',
  '/payments': 'Escrow & Payments',
  '/attendance': 'Attendance, Leave & Payroll',
  '/performance': 'Performance KPI',
  '/disputes': 'Dispute Resolution',
  '/chat': 'In-App Chat',
  '/ess': 'Employee Self-Service',
  '/offboarding': 'Offboarding',
  '/deliverables': 'Deliverable Integrity',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
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
    { id: 'n1', icon: 'alert', title: 'Dispute escalated', body: 'Project #PRJ-005 dispute has exceeded SLA — 2h remaining', time: '5m ago', read: false },
    { id: 'n2', icon: 'user', title: '3 new applicants', body: 'Senior Photo Retoucher role received 3 applications today', time: '1h ago', read: false },
    { id: 'n3', icon: 'payment', title: 'Escrow release pending', body: 'IDR 12,500,000 ready for release — project #PRJ-002 completed', time: '2h ago', read: false },
    { id: 'n4', icon: 'contract', title: 'Contract signed', body: 'Client Artisan Studio signed Brief #BRF-009', time: '4h ago', read: true },
    { id: 'n5', icon: 'clock', title: 'Leave request', body: 'Ahmad Rizki requested 2 days leave starting Mon 30 Jun', time: '6h ago', read: true },
  ],
  admin_manager: [
    { id: 'n1', icon: 'user', title: '3 new applicants', body: 'Senior Photo Retoucher role received 3 applications today', time: '1h ago', read: false },
    { id: 'n2', icon: 'clock', title: 'Leave request', body: 'Ahmad Rizki requested 2 days leave starting Mon 30 Jun', time: '2h ago', read: false },
    { id: 'n3', icon: 'alert', title: 'KPI alert', body: 'Budi Santoso completion rate dropped to 72% this month', time: '5h ago', read: true },
    { id: 'n4', icon: 'user', title: 'Offboarding initiated', body: 'Diana Permata offboarding checklist pending your approval', time: '1d ago', read: true },
  ],
  editor: [
    { id: 'n1', icon: 'contract', title: 'New revision request', body: 'Client requested major revision on Campaign Pack #PRJ-003', time: '15m ago', read: false },
    { id: 'n2', icon: 'package', title: 'Deliverable feedback', body: 'Your v3 submission received a 4.8 ★ client rating', time: '2h ago', read: false },
    { id: 'n3', icon: 'clock', title: 'Payslip ready', body: 'Your June 2026 payslip is available to download', time: '1d ago', read: true },
    { id: 'n4', icon: 'contract', title: 'Brief assigned', body: 'New project Brief #BRF-012 assigned — deadline Jul 10', time: '2d ago', read: true },
  ],
  client: [
    { id: 'n1', icon: 'package', title: 'Deliverable ready', body: 'Your v3 for Campaign Pack is ready for review', time: '30m ago', read: false },
    { id: 'n2', icon: 'payment', title: 'Escrow top-up required', body: 'Major revision approved — IDR 350,000 top-up needed', time: '3h ago', read: false },
    { id: 'n3', icon: 'contract', title: 'Revision classified', body: 'Your revision request was classified as MINOR — free', time: '1d ago', read: true },
    { id: 'n4', icon: 'payment', title: 'Payment received', body: 'Your DP payment of IDR 6,250,000 has been confirmed', time: '3d ago', read: true },
  ],
  mediator: [
    { id: 'n1', icon: 'alert', title: 'New dispute assigned', body: 'Dispute #DSP-003 assigned to you — SLA: 48h', time: '1h ago', read: false },
    { id: 'n2', icon: 'alert', title: 'SLA warning', body: 'Dispute #DSP-001 — only 2 hours remaining on SLA', time: '2h ago', read: false },
    { id: 'n3', icon: 'contract', title: 'Evidence submitted', body: 'Client uploaded 3 new files to Dispute #DSP-002', time: '4h ago', read: true },
  ],
  finance: [
    { id: 'n1', icon: 'payment', title: 'Escrow release ready', body: 'IDR 12,500,000 ready for release — project #PRJ-002', time: '30m ago', read: false },
    { id: 'n2', icon: 'payment', title: 'Payroll batch due', body: 'June 2026 payroll batch pending approval — 12 editors', time: '2h ago', read: false },
    { id: 'n3', icon: 'payment', title: 'DP received', body: 'Client Artisan Studio DP IDR 6,250,000 confirmed', time: '1d ago', read: true },
    { id: 'n4', icon: 'clock', title: 'Monthly reconciliation', body: 'May 2026 escrow ↔ payroll reconciliation report ready', time: '3d ago', read: true },
  ],
}

interface HeaderProps {
  pathname: string
  role: UserRole
}

export function Header({ pathname, role }: HeaderProps) {
  const title = pageTitles[pathname] ?? 'FairCut'
  const [open, setOpen] = useState(false)
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
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-navy">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-navy/30" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-9 pr-4 py-2 text-sm bg-primary-200 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 w-52 text-navy placeholder:text-navy/30"
          />
        </div>

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
                  <span className="text-sm font-semibold text-navy">Notifications</span>
                  {unread > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">{unread} new</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-navy/50 hover:text-navy transition-colors px-2 py-1 rounded-lg hover:bg-navy-50">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
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
                  {notifs.length} notification{notifs.length !== 1 ? 's' : ''} · Only current session
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
