import { Bell, Search } from 'lucide-react'
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
  '/settings': 'Settings',
}

interface HeaderProps {
  pathname: string
  role: UserRole
}

export function Header({ pathname, role: _role }: HeaderProps) {
  const title = pageTitles[pathname] ?? 'FairCut'

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
        <button className="relative p-2 rounded-xl hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
