import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from './types'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/layout/AppLayout'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import ApplyPage from './pages/apply/ApplyPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import RecruitmentPage from './pages/recruitment/RecruitmentPage'
import ContractsPage from './pages/contracts/ContractsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import AttendancePage from './pages/attendance/AttendancePage'
import PerformancePage from './pages/performance/PerformancePage'
import DisputesPage from './pages/disputes/DisputesPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import DepartmentsPage from './pages/departments/DepartmentsPage'
import TeamDashboardPage from './pages/team-dashboard/TeamDashboardPage'
import ESSPage from './pages/ess/ESSPage'
import ProfilePage from './pages/profile/ProfilePage'
import RoleHomePage from './pages/home/RoleHomePage'
import UsersPage from './pages/users/UsersPage'
import SystemPage from './pages/system/SystemPage'
import WarningPage from './pages/warning/WarningPage'
import ChatPage from './pages/chat/ChatPage'
import OffboardingPage from './pages/offboarding/OffboardingPage'
import SettingsPage from './pages/settings/SettingsPage'
import DeliverablesPage from './pages/deliverables/DeliverablesPage'
import AuditTrailPage from './pages/audit/AuditTrailPage'
import BrowseEditorsPage from './pages/browse-editors/BrowseEditorsPage'
import EscrowPage from './pages/finance/EscrowPage'
import EmergencyReleasePage from './pages/finance/EmergencyReleasePage'
import RefundPage from './pages/finance/RefundPage'
import BonusAccrualPage from './pages/finance/BonusAccrualPage'
import ReconciliationPage from './pages/finance/ReconciliationPage'
import RevenueReportPage from './pages/finance/RevenueReportPage'
import PayrollDisbursementPage from './pages/finance/PayrollDisbursementPage'

const ALLOWED_PATHS: Record<UserRole, string[]> = {
  superadmin: [
    '/dashboard', '/users', '/system', '/audit', '/escrow', '/emergency-release', '/refund', '/bonus-accrual', '/reconciliation', '/revenue-report', '/payroll-disbursement', '/payments', '/settings', '/profile',
  ],
  hr_admin: [
    '/dashboard', '/recruitment', '/attendance', '/payments', '/bonus-accrual', '/payroll-disbursement', '/performance',
    '/warning', '/escalation', '/offboarding', '/settings', '/profile',
  ],
  admin_manager: [
    '/dashboard', '/team-dashboard', '/attendance', '/departments', '/performance', '/projects',
    '/ess', '/warning', '/settings', '/profile',
  ],
  editor: [
    '/dashboard', '/projects', '/chat', '/ess', '/attendance', '/settings', '/profile',
  ],
  client: [
    '/dashboard', '/browse-editors', '/projects', '/settings',
  ],
  mediator: [
    '/dashboard', '/disputes', '/projects', '/settings',
  ],
  finance: [
    '/dashboard', '/payments', '/escrow', '/refund', '/bonus-accrual', '/reconciliation', '/revenue-report', '/attendance', '/audit', '/settings',
  ],
}

function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const location = useLocation()
  const allowed = ALLOWED_PATHS[role] ?? ALLOWED_PATHS.superadmin
  const path = location.pathname
  const isAllowed = allowed.some(p => path === p || path.startsWith(`${p}/`))
  if (!isAllowed) {
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
        <Route path="/apply" element={<ApplyPage />} />
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
        <Route path="/dashboard" element={<RoleHomePage user={user} />} />
        <Route path="/dashboard-legacy" element={<DashboardPage role={role} />} />
        <Route path="/recruitment" element={<RoleGuard role={role}><RecruitmentPage role={role} /></RoleGuard>} />
        <Route path="/projects" element={<RoleGuard role={role}><ProjectsPage role={role} /></RoleGuard>} />
        <Route path="/projects/:id" element={<RoleGuard role={role}><ProjectDetailPage role={role} /></RoleGuard>} />
        <Route path="/contracts" element={<RoleGuard role={role}><ContractsPage /></RoleGuard>} />
        <Route path="/payments" element={<RoleGuard role={role}><PaymentsPage role={role} /></RoleGuard>} />
        <Route path="/escrow" element={<RoleGuard role={role}><EscrowPage role={role} /></RoleGuard>} />
        <Route path="/emergency-release" element={<RoleGuard role={role}><EmergencyReleasePage role={role} /></RoleGuard>} />
        <Route path="/refund" element={<RoleGuard role={role}><RefundPage role={role} /></RoleGuard>} />
        <Route path="/bonus-accrual" element={<RoleGuard role={role}><BonusAccrualPage role={role} /></RoleGuard>} />
        <Route path="/reconciliation" element={<RoleGuard role={role}><ReconciliationPage role={role} /></RoleGuard>} />
        <Route path="/revenue-report" element={<RoleGuard role={role}><RevenueReportPage role={role} /></RoleGuard>} />
        <Route path="/payroll-disbursement" element={<RoleGuard role={role}><PayrollDisbursementPage role={role} /></RoleGuard>} />
        <Route path="/attendance" element={<RoleGuard role={role}><AttendancePage role={role} /></RoleGuard>} />
        <Route path="/departments" element={<RoleGuard role={role}><DepartmentsPage role={role} /></RoleGuard>} />
        <Route path="/team-dashboard" element={<RoleGuard role={role}><TeamDashboardPage role={role} /></RoleGuard>} />
        <Route path="/performance" element={<RoleGuard role={role}><PerformancePage role={role} /></RoleGuard>} />
        <Route path="/disputes" element={<RoleGuard role={role}><DisputesPage role={role} /></RoleGuard>} />
        <Route path="/deliverables" element={<RoleGuard role={role}><DeliverablesPage /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard role={role}><AuditTrailPage /></RoleGuard>} />
        <Route path="/chat" element={<RoleGuard role={role}><ChatPage /></RoleGuard>} />
        <Route path="/ess" element={<RoleGuard role={role}><ESSPage role={role} /></RoleGuard>} />
        <Route path="/profile" element={<RoleGuard role={role}><ProfilePage /></RoleGuard>} />
        <Route path="/offboarding" element={<RoleGuard role={role}><OffboardingPage /></RoleGuard>} />
        <Route path="/browse-editors" element={<RoleGuard role={role}><BrowseEditorsPage /></RoleGuard>} />
        <Route path="/users" element={<RoleGuard role={role}><UsersPage /></RoleGuard>} />
        <Route path="/system" element={<RoleGuard role={role}><SystemPage /></RoleGuard>} />
        <Route path="/warning" element={<RoleGuard role={role}><WarningPage role={role} /></RoleGuard>} />
        <Route path="/settings" element={<SettingsPage role={role} />} />
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
