import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types'
import logoLight from '../../assets/logo-light.png'
import {
  LayoutDashboard, Users, Briefcase, FileText, CreditCard,
  Clock, BarChart2, AlertTriangle, MessageSquare, UserCheck,
  Settings, ChevronLeft, LogOut, PackageCheck, Shield, X, Search, User, Home,
} from 'lucide-react'

interface NavItem { to: string; icon: typeof LayoutDashboard; label: string }

const navByRole: Record<UserRole, NavItem[]> = {
  superadmin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/recruitment', icon: Users, label: 'Rekrutmen' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
    { to: '/contracts', icon: FileText, label: 'Kontrak' },
    { to: '/payments', icon: CreditCard, label: 'Escrow & Pembayaran' },
    { to: '/attendance', icon: Clock, label: 'Absensi & Penggajian' },
    { to: '/performance', icon: BarChart2, label: 'KPI Kinerja' },
    { to: '/disputes', icon: AlertTriangle, label: 'Sengketa' },
    { to: '/deliverables', icon: PackageCheck, label: 'Hasil Kerja' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/offboarding', icon: UserCheck, label: 'Pengakhiran Kerja' },
    { to: '/audit', icon: Shield, label: 'Jejak Audit' },
  ],
  admin_manager: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/recruitment', icon: Users, label: 'Rekrutmen' },
    { to: '/attendance', icon: Clock, label: 'Absensi & Cuti' },
    { to: '/performance', icon: BarChart2, label: 'KPI Kinerja' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
    { to: '/offboarding', icon: UserCheck, label: 'Pengakhiran Kerja' },
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
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/disputes', icon: AlertTriangle, label: 'Sengketa' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
  ],
  finance: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/payments', icon: CreditCard, label: 'Escrow & Keuangan' },
    { to: '/attendance', icon: Clock, label: 'Penggajian' },
    { to: '/audit', icon: Shield, label: 'Jejak Audit' },
  ],
}

const roleLabels: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin_manager: 'Manajer Admin',
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

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-navy flex flex-col z-50',
      'transition-all duration-300',
      // Desktop: always visible, width controlled by collapsed state
      'lg:translate-x-0',
      collapsed ? 'lg:w-16' : 'lg:w-60',
      // Mobile: full width, slide in/out
      'w-60',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <img src={logoLight} alt="Manava" className="h-7 w-auto object-contain object-left" />
        )}
        {collapsed && (
          <img src={logoLight} alt="Manava" className="h-7 w-auto object-contain mx-auto" />
        )}
        <div className="flex items-center gap-1">
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse */}
          {!collapsed && (
            <button
              onClick={() => onCollapse(true)}
              className="hidden lg:block p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="px-4 py-3">
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{roleLabels[role]}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
              isActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10',
              collapsed && 'lg:justify-center'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + controls */}
      <div className="px-2 py-3 border-t border-white/10 space-y-1">
        {collapsed ? (
          <button
            onClick={() => onCollapse(false)}
            className="hidden lg:flex w-full justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {userName.split(' ').map(n => n[0]).slice(0,2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-white/40 text-xs">{roleLabels[role]}</p>
            </div>
          </div>
        )}

        {/* Account section — sits directly above the logout button */}
        {role === 'editor' && (
          <>
            {!collapsed && (
              <p className="px-3 pt-1 pb-0.5 text-white/30 text-[11px] font-semibold uppercase tracking-wider">Akun</p>
            )}
            <NavLink
              to="/profile"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10',
                collapsed && 'lg:justify-center'
              )}
              title={collapsed ? 'Profil' : undefined}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>Profil</span>
            </NavLink>
          </>
        )}

        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors',
            collapsed && 'lg:justify-center'
          )}
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Keluar</span>
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10',
            collapsed && 'lg:justify-center'
          )}
          title={collapsed ? 'Pengaturan' : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Pengaturan</span>
        </NavLink>
      </div>
    </aside>
  )
}
