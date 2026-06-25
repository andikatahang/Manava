import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types'
import {
  LayoutDashboard, Users, Briefcase, FileText, CreditCard,
  Clock, BarChart2, AlertTriangle, MessageSquare, UserCheck,
  Settings, ChevronLeft, Scissors, LogOut,
} from 'lucide-react'

interface NavItem { to: string; icon: typeof LayoutDashboard; label: string }

const navByRole: Record<UserRole, NavItem[]> = {
  superadmin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/recruitment', icon: Users, label: 'Recruitment' },
    { to: '/projects', icon: Briefcase, label: 'Projects' },
    { to: '/contracts', icon: FileText, label: 'Contracts' },
    { to: '/payments', icon: CreditCard, label: 'Escrow & Payments' },
    { to: '/attendance', icon: Clock, label: 'Attendance & Payroll' },
    { to: '/performance', icon: BarChart2, label: 'Performance KPI' },
    { to: '/disputes', icon: AlertTriangle, label: 'Disputes' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/offboarding', icon: UserCheck, label: 'Offboarding' },
  ],
  admin_manager: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance & Leave' },
    { to: '/performance', icon: BarChart2, label: 'Performance KPI' },
    { to: '/projects', icon: Briefcase, label: 'Projects' },
  ],
  editor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: Briefcase, label: 'My Projects' },
    { to: '/contracts', icon: FileText, label: 'Contracts' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/ess', icon: UserCheck, label: 'Self Service' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
  ],
  client: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: Briefcase, label: 'My Projects' },
    { to: '/contracts', icon: FileText, label: 'Contracts' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/disputes', icon: AlertTriangle, label: 'Disputes' },
  ],
  mediator: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/disputes', icon: AlertTriangle, label: 'Disputes' },
    { to: '/projects', icon: Briefcase, label: 'Projects' },
  ],
  finance: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/payments', icon: CreditCard, label: 'Escrow & Finance' },
    { to: '/attendance', icon: Clock, label: 'Payroll' },
  ],
}

const roleLabels: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin_manager: 'Admin Manager',
  editor: 'Editor',
  client: 'Client',
  mediator: 'Mediator',
  finance: 'Finance',
}

interface SidebarProps {
  role: UserRole
  userName: string
  collapsed: boolean
  onCollapse: (v: boolean) => void
  onLogout: () => void
}

export function Sidebar({ role, userName, collapsed, onCollapse, onLogout }: SidebarProps) {
  const items = navByRole[role] ?? navByRole.superadmin

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-navy flex flex-col transition-all duration-300 z-40',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-navy" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">FairCut</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto">
            <Scissors className="w-4 h-4 text-navy" />
          </div>
        )}
        {!collapsed && (
          <button onClick={() => onCollapse(true)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
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
              collapsed && 'justify-center'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + collapse/expand */}
      <div className="px-2 py-3 border-t border-white/10 space-y-1">
        {collapsed ? (
          <button onClick={() => onCollapse(false)} className="w-full flex justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors">
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
        <button
          onClick={onLogout}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors', collapsed && 'justify-center')}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <NavLink to="/settings" className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors', collapsed && 'justify-center')} title={collapsed ? 'Settings' : undefined}>
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}
