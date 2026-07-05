import { useSearchParams } from 'react-router-dom'
import { Users, Clock, BarChart2, Briefcase } from 'lucide-react'
import { TeamPresensiTab } from '../attendance/TeamPresensiTab'
import PerformancePage from '../performance/PerformancePage'
import ProjectsPage from '../projects/ProjectsPage'
import DepartmentsPage from '../departments/DepartmentsPage'
import type { UserRole } from '../../types'

// One dashboard that consolidates the Admin Manager's department surfaces:
// team roster, Presensi (kehadiran anggota + persetujuan cuti), KPI Tim,
// and Proyek Tim.
type Tab = 'anggota' | 'presensi' | 'kpi' | 'proyek'

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'anggota',  label: 'Anggota',   icon: Users },
  { key: 'presensi', label: 'Presensi',  icon: Clock },
  { key: 'kpi',      label: 'KPI Tim',   icon: BarChart2 },
  { key: 'proyek',   label: 'Proyek Tim', icon: Briefcase },
]

export default function TeamDashboardPage({ role }: { role: UserRole }) {
  // Tab lives in the URL (?tab=) so the sidebar sub-navigation can deep-link.
  const [searchParams, setSearchParams] = useSearchParams()
  // Legacy deep-links: the old "cuti" tab merged into "presensi".
  const tabParam = searchParams.get('tab') === 'cuti' ? 'presensi' : searchParams.get('tab')
  const tab: Tab = TABS.some(t => t.key === tabParam) ? (tabParam as Tab) : 'anggota'
  const setTab = (key: Tab) => setSearchParams({ tab: key })

  return (
    <div className="space-y-6">
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
      {tab === 'presensi' && <TeamPresensiTab role={role} />}
      {tab === 'kpi'      && <PerformancePage role={role} embedded />}
      {tab === 'proyek'   && <ProjectsPage role={role} />}
    </div>
  )
}
