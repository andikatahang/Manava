import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { cn } from '../../lib/utils'
import type { User } from '../../types'

interface AppLayoutProps {
  user: User
  onLogout: () => void
  children: React.ReactNode
}

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isEditor = user.role === 'editor'

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-primary">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        role={user.role}
        userName={user.full_name}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn(
        'transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-60'
      )}>
        <Header
          pathname={location.pathname}
          role={user.role}
          onMenuClick={() => setMobileOpen(v => !v)}
        />
        <main className={cn(
          'p-4 sm:p-6 min-h-[calc(100vh-4rem)]',
          isEditor && 'pb-24 lg:pb-6'
        )}>
          {children}
        </main>
      </div>

      {isEditor && <MobileBottomNav />}
    </div>
  )
}
