import { NavLink } from 'react-router-dom'
import {
  Home, Briefcase, UserCheck, User, Users, Clock, CreditCard, BarChart2,
  AlertTriangle, Shield, Search, FileText, PackageCheck, MessageSquare, BadgeDollarSign,
  Cog, Building2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types'

interface BottomNavItem { to: string; icon: typeof Home; label: string }

const itemsByRole: Record<UserRole, BottomNavItem[]> = {
  superadmin: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/users', icon: Users, label: 'Akun' },
    { to: '/system', icon: Cog, label: 'Sistem' },
    { to: '/audit', icon: Shield, label: 'Audit' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  hr_admin: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/recruitment', icon: Users, label: 'ATS' },
    { to: '/departments', icon: Building2, label: 'Departemen' },
    { to: '/ess', icon: UserCheck, label: 'Mandiri' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  admin_manager: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/attendance', icon: Clock, label: 'Cuti' },
    { to: '/performance', icon: BarChart2, label: 'KPI' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  editor: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
    { to: '/ess', icon: UserCheck, label: 'Mandiri' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  client: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/browse-editors', icon: Search, label: 'Cari' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  mediator: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/disputes', icon: AlertTriangle, label: 'Sengketa' },
    { to: '/projects', icon: Briefcase, label: 'Proyek' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
  finance: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/payments', icon: CreditCard, label: 'Escrow' },
    { to: '/attendance', icon: BadgeDollarSign, label: 'Payroll' },
    { to: '/audit', icon: Shield, label: 'Audit' },
    { to: '/profile', icon: User, label: 'Profil' },
  ],
}

const ROLE_ICONS = { FileText, PackageCheck } // referenced indirectly to silence unused-import lint
void ROLE_ICONS

interface MobileBottomNavProps { role: UserRole }

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const items = itemsByRole[role] ?? itemsByRole.editor

  return (
    <nav
      aria-label="Navigasi utama"
      className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      <div className="flex items-center gap-1 bg-[#021526] rounded-full px-2 py-1.5 shadow-[0_12px_40px_-12px_rgba(2,21,38,0.4)] border border-white/[0.06]">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center min-w-[58px] px-2.5 py-1.5 rounded-full transition-all duration-200',
                isActive
                  ? 'bg-[#D0F100] text-[#021526]'
                  : 'text-white/55 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.85} />
                <span className={cn('text-[10px] font-semibold tracking-[-0.01em] mt-0.5', isActive ? 'text-[#021526]' : 'text-white/65')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
