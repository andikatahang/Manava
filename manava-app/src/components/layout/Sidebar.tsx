import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types'
import logoDark from '../../assets/logo-dark.png'
import {
  LayoutDashboard, Users, Briefcase, CreditCard,
  Clock, BarChart2, AlertTriangle, UserCheck,
  Settings, ChevronLeft, LogOut, Shield, X, Search, User, Home,
  BadgeDollarSign, AlertOctagon, ArrowUpRightFromSquare, Cog,
} from 'lucide-react'

interface NavItem { to: string; icon: typeof LayoutDashboard; label: string }

const navByRole: Record<UserRole, NavItem[]> = {
  superadmin: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/users', icon: Users, label: 'Pengguna & Role' },
    { to: '/system', icon: Cog, label: 'Sistem & Enkripsi' },
    { to: '/audit', icon: Shield, label: 'Jejak Audit' },
  ],
  hr_admin: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/recruitment', icon: Users, label: 'Rekrutmen & ATS' },
    { to: '/attendance', icon: Clock, label: 'Absensi & Cutoff' },
    { to: '/payments', icon: CreditCard, label: 'Payroll Run' },
    { to: '/performance', icon: BarChart2, label: 'KPI Editor' },
    { to: '/warning', icon: AlertOctagon, label: 'Peringatan Kerja' },
    { to: '/escalation', icon: ArrowUpRightFromSquare, label: 'Eskalasi Tinggi' },
    { to: '/offboarding', icon: UserCheck, label: 'Offboarding' },
  ],
  admin_manager: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/attendance', icon: Clock, label: 'Absensi & Cuti Tim' },
    { to: '/performance', icon: BarChart2, label: 'KPI Tim' },
    { to: '/escalation', icon: ArrowUpRightFromSquare, label: 'Eskalasi Menengah' },
    { to: '/projects', icon: Briefcase, label: 'Proyek Tim' },
    { to: '/offboarding', icon: UserCheck, label: 'Pengakhiran' },
  ],
  editor: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/projects', icon: Briefcase, label: 'Proyek Saya' },
    { to: '/ess', icon: UserCheck, label: 'Layanan Mandiri' },
  ],
  client: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/browse-editors', icon: Search, label: 'Cari Editor' },
    { to: '/projects', icon: Briefcase, label: 'Proyek Saya' },
  ],
  mediator: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/disputes', icon: AlertTriangle, label: 'Sengketa' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
  ],
  finance: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/payments', icon: CreditCard, label: 'Escrow & Ledger' },
    { to: '/attendance', icon: BadgeDollarSign, label: 'Disbursement' },
    { to: '/audit', icon: Shield, label: 'Jejak Audit' },
  ],
}

const roleLabels: Record<UserRole, string> = {
  superadmin: 'System Admin',
  hr_admin: 'HR Admin',
  admin_manager: 'Admin Manager',
  editor: 'Editor',
  client: 'Klien',
  mediator: 'Mediator',
  finance: 'Keuangan',
}

interface SidebarProps {
  role: UserRole
  userName: string
  collapsed: boolean
  onCollapse: (v: boolean) => void
  onLogout: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ role, userName, collapsed, onCollapse, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const items = navByRole[role] ?? navByRole.superadmin
  const initials = userName.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[#fbfbfb] border-r border-[#EDEDED] flex flex-col z-50',
        'transition-all duration-300',
        'lg:translate-x-0',
        collapsed ? 'lg:w-16' : 'lg:w-60',
        'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#EDEDED]">
        {!collapsed && (
          <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain object-left" />
        )}
        {collapsed && (
          <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain mx-auto" />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-lg text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {!collapsed && (
            <button
              onClick={() => onCollapse(true)}
              className="hidden lg:block p-1 rounded-lg text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#596074]">{roleLabels[role]}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium tracking-[-0.01em] transition-all duration-150',
                isActive
                  ? 'text-[#021526] bg-[#D0F100]'
                  : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
                collapsed && 'lg:justify-center',
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
            <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + controls */}
      <div className="px-2 py-3 border-t border-[#EDEDED] space-y-1">
        {collapsed ? (
          <button
            onClick={() => onCollapse(false)}
            className="hidden lg:flex w-full justify-center p-2.5 rounded-full text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-[#021526] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#021526] text-[13px] font-semibold truncate">{userName}</p>
              <p className="text-[#596074] text-[11px]">{roleLabels[role]}</p>
            </div>
          </div>
        )}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium transition-all',
              isActive
                ? 'text-[#021526] bg-[#021526]/[0.06]'
                : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
              collapsed && 'lg:justify-center',
            )
          }
          title={collapsed ? 'Profil' : undefined}
        >
          <User className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Profil</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium transition-all',
              isActive
                ? 'text-[#021526] bg-[#021526]/[0.06]'
                : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
              collapsed && 'lg:justify-center',
            )
          }
          title={collapsed ? 'Pengaturan' : undefined}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Pengaturan</span>
        </NavLink>

        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors',
            collapsed && 'lg:justify-center',
          )}
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
