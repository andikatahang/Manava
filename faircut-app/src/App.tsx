import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from './types'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/layout/AppLayout'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import RecruitmentPage from './pages/recruitment/RecruitmentPage'
import ContractsPage from './pages/contracts/ContractsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import AttendancePage from './pages/attendance/AttendancePage'
import PerformancePage from './pages/performance/PerformancePage'
import DisputesPage from './pages/disputes/DisputesPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ESSPage from './pages/ess/ESSPage'
import ChatPage from './pages/chat/ChatPage'
import OffboardingPage from './pages/offboarding/OffboardingPage'
import SettingsPage from './pages/settings/SettingsPage'
import DeliverablesPage from './pages/deliverables/DeliverablesPage'
import AuditTrailPage from './pages/audit/AuditTrailPage'

const ALLOWED_PATHS: Record<UserRole, string[]> = {
  superadmin: [
    '/dashboard', '/recruitment', '/projects', '/contracts', '/payments',
    '/attendance', '/performance', '/disputes', '/deliverables', '/chat',
    '/offboarding', '/audit', '/settings', '/ess',
  ],
  admin_manager: [
    '/dashboard', '/recruitment', '/attendance', '/performance', '/projects',
    '/settings', '/offboarding',
  ],
  editor: [
    '/dashboard', '/projects', '/contracts', '/chat', '/deliverables',
    '/ess', '/attendance', '/settings',
  ],
  client: [
    '/dashboard', '/projects', '/contracts', '/deliverables', '/chat',
    '/payments', '/disputes', '/settings',
  ],
  mediator: [
    '/dashboard', '/disputes', '/projects', '/settings',
  ],
  finance: [
    '/dashboard', '/payments', '/attendance', '/audit', '/settings',
  ],
}

function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const location = useLocation()
  const allowed = ALLOWED_PATHS[role] ?? ALLOWED_PATHS.superadmin
  if (!allowed.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { user, login, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={(role: UserRole) => login(role)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const role = user.role

  return (
    <AppLayout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage role={role} />} />
        <Route path="/recruitment" element={<RoleGuard role={role}><RecruitmentPage role={role} /></RoleGuard>} />
        <Route path="/projects" element={<RoleGuard role={role}><ProjectsPage role={role} /></RoleGuard>} />
        <Route path="/contracts" element={<RoleGuard role={role}><ContractsPage /></RoleGuard>} />
        <Route path="/payments" element={<RoleGuard role={role}><PaymentsPage role={role} /></RoleGuard>} />
        <Route path="/attendance" element={<RoleGuard role={role}><AttendancePage role={role} /></RoleGuard>} />
        <Route path="/performance" element={<RoleGuard role={role}><PerformancePage role={role} /></RoleGuard>} />
        <Route path="/disputes" element={<RoleGuard role={role}><DisputesPage role={role} /></RoleGuard>} />
        <Route path="/deliverables" element={<RoleGuard role={role}><DeliverablesPage /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard role={role}><AuditTrailPage /></RoleGuard>} />
        <Route path="/chat" element={<RoleGuard role={role}><ChatPage /></RoleGuard>} />
        <Route path="/ess" element={<RoleGuard role={role}><ESSPage /></RoleGuard>} />
        <Route path="/offboarding" element={<RoleGuard role={role}><OffboardingPage /></RoleGuard>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
