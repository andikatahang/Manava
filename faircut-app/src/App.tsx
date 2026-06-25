import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

  return (
    <AppLayout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage role={user.role} />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/disputes" element={<DisputesPage />} />
        <Route path="/deliverables" element={<DeliverablesPage />} />
        <Route path="/audit" element={<AuditTrailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/ess" element={<ESSPage />} />
        <Route path="/offboarding" element={<OffboardingPage />} />
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
