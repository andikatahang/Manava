import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, UserCheck, User } from 'lucide-react'
import { cn } from '../../lib/utils'

interface BottomNavItem { to: string; icon: typeof LayoutDashboard; label: string }

// Editor's primary destinations, surfaced as a thumb-friendly tab bar on mobile.
const items: BottomNavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/projects', icon: Briefcase, label: 'Proyek' },
  { to: '/ess', icon: UserCheck, label: 'Mandiri' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fbfbfb]/95 backdrop-blur-md border-t border-black/[0.06] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-navy' : 'text-navy/45 hover:text-navy/70'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
                  isActive && 'bg-navy/10'
                )}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
