import { useSearchParams } from 'react-router-dom'
import { Users, Clock, BarChart2, Briefcase, FileText, Receipt } from 'lucide-react'
import { TeamPresensiTab } from '../attendance/TeamPresensiTab'
import PerformancePage from '../performance/PerformancePage'
import ProjectsPage from '../projects/ProjectsPage'
import DepartmentsPage from '../departments/DepartmentsPage'
import ReportGenerateForm from './ReportGenerateForm'
import { TeamReimbursements } from './TeamReimbursements'
import { AutoAggregationSummary } from './AutoAggregationSummary'
import type { UserRole } from '../../types'

// One dashboard that consolidates the Admin Manager's department surfaces:
// team roster, Presensi (kehadiran anggota + persetujuan cuti), KPI Tim,
// and Proyek Tim.
type Tab = 'anggota' | 'presensi' | 'klaim' | 'kpi' | 'proyek' | 'laporan'

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'anggota',  label: 'Rapor Performa & Evaluasi',   icon: Users },
  { key: 'presensi', label: 'Dashboard Ketersediaan Tim',  icon: Clock },
  { key: 'klaim',    label: 'Persetujuan Klaim Dana',  icon: Receipt },
  { key: 'kpi',      label: 'Tren Kinerja & Target',   icon: BarChart2 },
  { key: 'proyek',   label: 'Alokasi Proyek', icon: Briefcase },
  { key: 'laporan',  label: 'Draft Laporan Bulanan',  icon: FileText },
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
      {tab === 'klaim'    && <TeamReimbursements />}
      {tab === 'kpi'      && <PerformancePage role={role} embedded />}
      {tab === 'proyek'   && <ProjectsPage role={role} />}
      {tab === 'laporan'  && (
        <div className="space-y-6">
          <AutoAggregationSummary />
          <div className="card space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-bold text-navy">Draft Laporan Bulanan Departemen</h3>
              <p className="text-sm text-navy/60 mt-1">
                Sistem meng-agregasi aktivitas harian editor (presensi, cuti, KPI, peringatan) secara otomatis.
                Review draft di bawah, lalu teruskan ke HR Admin sebagai dasar review kinerja dan finalisasi payroll.
              </p>
            </div>
            <ReportGenerateForm />
          </div>
        </div>
      )}
    </div>
  )
}
