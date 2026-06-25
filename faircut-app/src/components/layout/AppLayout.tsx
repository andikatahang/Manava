import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '../../lib/utils'
import type { User } from '../../types'

interface AppLayoutProps {
  user: User
  onLogout: () => void
  children: React.ReactNode
}

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-primary">
      <Sidebar
        role={user.role}
        userName={user.full_name}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onLogout={onLogout}
      />
      <div className={cn('transition-all duration-300', collapsed ? 'pl-16' : 'pl-60')}>
        <Header pathname={location.pathname} role={user.role} />
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
