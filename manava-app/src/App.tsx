import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from './types'
import { isRoleDisabled } from './lib/roles'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/layout/AppLayout'
import { DefaultPasswordPrompt } from './components/auth/DefaultPasswordPrompt'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import ApplyPage from './pages/apply/ApplyPage'
import RecruitmentPage from './pages/recruitment/RecruitmentPage'
import ApplicantDetailPage from './pages/recruitment/ApplicantDetailPage'
import PayrollPage from './pages/payroll/PayrollPage'
import AttendancePage from './pages/attendance/AttendancePage'
import PerformancePage from './pages/performance/PerformancePage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectRoomPage from './pages/projects/ProjectRoomPage'
import BrowseEditorsPage from './pages/browse/BrowseEditorsPage'
import DepartmentsPage from './pages/departments/DepartmentsPage'
import TeamDashboardPage from './pages/team-dashboard/TeamDashboardPage'
import ESSPage from './pages/ess/ESSPage'
import ProfilePage from './pages/profile/ProfilePage'
import RoleHomePage from './pages/home/RoleHomePage'
import UsersPage from './pages/users/UsersPage'
import SystemPage from './pages/system/SystemPage'
import WarningPage from './pages/warning/WarningPage'
import OffboardingPage from './pages/offboarding/OffboardingPage'
import SettingsPage from './pages/settings/SettingsPage'
import AuditTrailPage from './pages/audit/AuditTrailPage'

// Only the active roles have entries — disabled roles (mediator, finance)
// fall through to the superadmin fallback but their accounts can't log in at
// the auth gate.
const ALLOWED_PATHS: Record<UserRole, string[]> = {
  superadmin: [
    '/dashboard', '/users', '/system', '/audit', '/payments', '/settings', '/profile',
  ],
  hr_admin: [
    '/dashboard', '/recruitment', '/attendance', '/departments', '/payments', '/performance',
    '/warning', '/offboarding', '/ess', '/settings', '/profile',
  ],
  admin_manager: [
    '/dashboard', '/team-dashboard', '/attendance', '/departments', '/performance', '/projects',
    '/ess', '/warning', '/settings', '/profile',
  ],
  editor: [
    '/dashboard', '/projects', '/ess', '/attendance', '/warning', '/settings', '/profile',
  ],
  client: [
    '/dashboard', '/browse-editors', '/projects', '/settings', '/profile',
  ],
  mediator: [],
  finance: [],
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
  const location = useLocation()
  const { user, login, logout, isAuthenticated, isHydrating } = useAuth()

  // Wait for the silent refresh before deciding login vs app — avoids a
  // login-page flash on reload for users with a live session.
  if (isHydrating) {
    return <div className="min-h-screen bg-primary" aria-busy="true" />
  }

  // Root selalu menampilkan landing page publik dulu, terlepas dari sesi yang
  // tersimpan — sesi aktif tidak boleh melompat otomatis ke dashboard tanpa
  // melewati landing page. Landing page dirender di luar AppLayout supaya
  // tidak ikut terbungkus chrome sidebar/header aplikasi.
  if (location.pathname === '/') {
    return <LandingPage />
  }

  if (!isAuthenticated || !user) {
    return (
      <Routes>
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const role = user.role

  // Pengaman ekstra: sesi lama dengan role yang sudah dinonaktifkan
  // (client/mediator/finance) tidak boleh masuk ke UI aplikasi.
  if (isRoleDisabled(role)) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-navy">Role dinonaktifkan</h1>
        <p className="text-navy/60 max-w-md text-sm">
          Akses untuk role ini sedang dinonaktifkan sementara. Silakan hubungi administrator.
        </p>
        <button type="button" onClick={() => void logout()} className="btn-primary px-6 py-2.5">
          Keluar
        </button>
      </div>
    )
  }

  return (
    <AppLayout user={user} onLogout={logout}>
      {/* Saran ganti password untuk akun editor baru yang masih memakai
          password default — muncul lagi tiap login sampai password diganti. */}
      <DefaultPasswordPrompt key={user.user_id} user={user} />
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RoleHomePage user={user} />} />
        <Route path="/recruitment" element={<RoleGuard role={role}><RecruitmentPage role={role} /></RoleGuard>} />
        <Route path="/recruitment/:id" element={<RoleGuard role={role}><ApplicantDetailPage /></RoleGuard>} />
        <Route path="/projects" element={<RoleGuard role={role}><ProjectsPage role={role} /></RoleGuard>} />
        <Route path="/projects/:id" element={<RoleGuard role={role}><ProjectRoomPage role={role} /></RoleGuard>} />
        <Route path="/browse-editors" element={<RoleGuard role={role}><BrowseEditorsPage /></RoleGuard>} />
        <Route path="/payments" element={<RoleGuard role={role}><PayrollPage /></RoleGuard>} />
        <Route path="/attendance" element={<RoleGuard role={role}><AttendancePage role={role} /></RoleGuard>} />
        <Route path="/departments" element={<RoleGuard role={role}><DepartmentsPage role={role} /></RoleGuard>} />
        <Route path="/team-dashboard" element={<RoleGuard role={role}><TeamDashboardPage role={role} /></RoleGuard>} />
        <Route path="/performance" element={<RoleGuard role={role}><PerformancePage role={role} /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard role={role}><AuditTrailPage /></RoleGuard>} />
        <Route path="/ess" element={<RoleGuard role={role}><ESSPage role={role} /></RoleGuard>} />
        <Route path="/profile" element={<RoleGuard role={role}><ProfilePage /></RoleGuard>} />
        <Route path="/offboarding" element={<RoleGuard role={role}><OffboardingPage /></RoleGuard>} />
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
