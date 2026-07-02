import { useState } from 'react'
import { Users, Clock, CalendarCheck, BarChart2, Briefcase } from 'lucide-react'
import { PageHeader } from '../../components/page/PageHeader'
import AttendancePage from '../attendance/AttendancePage'
import PerformancePage from '../performance/PerformancePage'
import ProjectsPage from '../projects/ProjectsPage'
import DepartmentsPage from '../departments/DepartmentsPage'
import type { UserRole } from '../../types'

// One dashboard that consolidates the Admin Manager's department surfaces:
// team roster, Presensi, Permohonan Cuti, KPI Tim, and Proyek Tim.
type Tab = 'anggota' | 'presensi' | 'cuti' | 'kpi' | 'proyek'

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'anggota',  label: 'Anggota',         icon: Users },
  { key: 'presensi', label: 'Presensi',        icon: Clock },
  { key: 'cuti',     label: 'Permohonan Cuti', icon: CalendarCheck },
  { key: 'kpi',      label: 'KPI Tim',         icon: BarChart2 },
  { key: 'proyek',   label: 'Proyek Tim',      icon: Briefcase },
]

export default function TeamDashboardPage({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<Tab>('anggota')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operasi tim"
        title="Dashboard Departemen"
        description="Kontrol editor departemen Anda — anggota, presensi & cuti, KPI, dan proyek dalam satu tempat."
        role={role}
      />

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels reuse the existing pages (embedded = no duplicate header) */}
      {tab === 'anggota'  && <DepartmentsPage role={role} embedded />}
      {tab === 'presensi' && <AttendancePage role={role} embedded forcedView="attendance" />}
      {tab === 'cuti'     && <AttendancePage role={role} embedded forcedView="leave" />}
      {tab === 'kpi'      && <PerformancePage role={role} embedded />}
      {tab === 'proyek'   && <ProjectsPage role={role} />}
    </div>
  )
}
