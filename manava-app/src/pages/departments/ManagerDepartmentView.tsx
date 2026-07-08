import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Star, TrendingUp, Award, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency } from '../../lib/utils'
import { useMe } from '../../hooks/queries/useMe'
import { useDepartments, type DepartmentDetail } from '../../hooks/queries/useDepartments'
import { useProjects } from '../../hooks/queries/useProjects'
import { useTeamAttendance } from '../../hooks/queries/useAttendance'
import { fmtTimeWIB, type TeamAttendanceMember } from '../../lib/attendance'
import { useMonthlyKpi, useEditorMonthlyKpi } from '../../hooks/queries/useKpi'
import { EditorKpiTrendChart } from '../performance/EditorKpiTrendChart'
import { DepartmentKpiMetrics } from './DepartmentKpiMetrics'
import { DepartmentKpiInsight } from './DepartmentKpiInsight'
import type { Editor, Project, UserRole } from '../../types'

const SPEC_LABELS: Record<string, string> = {
  product_retouch: 'Product Retouch',
  color_correction: 'Color Correction',
  video_edit: 'Video Edit',
  color_grading: 'Color Grading',
  portrait_retouch: 'Portrait Retouch',
  background_removal: 'BG Removal',
  vfx: 'VFX',
  motion_graphics: 'Motion Graphics',
}

const BAND_LABELS: Record<Editor['performance_band'], string> = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  needs_improvement: 'Perlu Peningkatan',
}

// The Admin Manager's own department hub — real data end to end: departments
// are filtered to the signed-in manager, presensi comes from /attendance/team,
// and projects from /projects.
export function ManagerDepartmentView(_props: { role: UserRole; embedded?: boolean }) {
  const navigate = useNavigate()
  const meQuery = useMe()
  const departmentsQuery = useDepartments()
  const projectsQuery = useProjects()
  const teamQuery = useTeamAttendance()
  const deptTrendQuery = useMonthlyKpi()
  const editorTrendQuery = useEditorMonthlyKpi()

  const me = meQuery.data
  const departments = useMemo(
    () => (departmentsQuery.data ?? []).filter(d => d.manager.user_id === me?.user_id),
    [departmentsQuery.data, me],
  )
  const attendanceByUser = useMemo(
    () => new Map((teamQuery.data ?? []).map(m => [m.user_id, m])),
    [teamQuery.data],
  )

  if (meQuery.isLoading || departmentsQuery.isLoading) {
    return <p className="text-sm text-navy/50">Memuat departemen…</p>
  }
  if (departmentsQuery.isError) {
    return (
      <p className="text-sm text-red-600">
        Gagal memuat departemen — pastikan backend berjalan. ({(departmentsQuery.error as Error).message})
      </p>
    )
  }
  if (departments.length === 0) {
    return <div className="card text-center py-10 text-navy/40 text-sm">Anda belum ditunjuk sebagai manajer departemen.</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {departments.map(dep => {
        const deptDeptPoints = (deptTrendQuery.data ?? []).filter(p => p.department === dep.name)
        const deptEditorPoints = (editorTrendQuery.data ?? []).filter(p => p.department === dep.name)
        return (
          <div key={dep.id} className="space-y-4">
            {/* 2-column layout: Charts on left, Insight AI on right */}
            <div className="grid grid-cols-3 gap-4">
              {/* Left column: KPI Metrics + Trend Chart */}
              <div className="col-span-2 space-y-4">
                {deptDeptPoints.length > 0 && (
                  <DepartmentKpiMetrics points={deptDeptPoints} department={dep.name} />
                )}
                {deptEditorPoints.length > 0 && (
                  <EditorKpiTrendChart
                    points={deptEditorPoints}
                    department={dep.name}
                    title={`Perkembangan Anggota — ${dep.name}`}
                    subtitle="Tren KPI setiap editor di departemen Anda selama 6 bulan terakhir."
                  />
                )}
              </div>

              {/* Right column: AI Insight */}
              <div>
                {deptDeptPoints.length > 0 && (
                  <DepartmentKpiInsight points={deptDeptPoints} department={dep.name} />
                )}
              </div>
            </div>

            {/* Full width: Department Block */}
            <DepartmentBlock
              department={dep}
              projects={projectsQuery.data ?? []}
              attendanceByUser={attendanceByUser}
              onOpenProject={id => navigate(`/projects/${id}`)}
            />
          </div>
        )
      })}
    </div>
  )
}

function DepartmentBlock({ department, projects, attendanceByUser, onOpenProject }: {
  department: DepartmentDetail
  projects: Project[]
  attendanceByUser: Map<string, TeamAttendanceMember>
  onOpenProject: (id: string) => void
}) {
  const editors = department.editors.filter(e => e.status === 'active')

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-navy text-white shrink-0">
          <Building2 className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-navy truncate">{department.name}</h2>
          <p className="text-xs text-navy/50">{editors.length} editor</p>
        </div>
      </div>

      {editors.length === 0 ? (
        <div className="card text-center py-10 text-navy/40 text-sm">Belum ada editor di departemen ini.</div>
      ) : (
        editors.map(e => (
          <EditorHubCard
            key={e.editor_id}
            editor={e}
            attendance={attendanceByUser.get(e.user_id)}
            projects={projects.filter(p => p.editor_id === e.editor_id)}
            onOpenProject={onOpenProject}
          />
        ))
      )}
    </section>
  )
}

// Today's presensi chip, driven by the same /attendance/team data as the
// Presensi tab: clocked in → Hadir/Terlambat + time; otherwise Belum Presensi.
function presenceChip(attendance: TeamAttendanceMember | undefined) {
  const rec = attendance?.today
  if (rec?.clock_in) {
    const late = rec.status === 'late'
    return {
      label: `${late ? 'Terlambat' : 'Hadir'} · ${fmtTimeWIB(rec.clock_in)}`,
      tone: late
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
    }
  }
  return { label: 'Belum Presensi', tone: 'text-navy/50 bg-white border-border' }
}

function EditorHubCard({ editor, attendance, projects, onOpenProject }: {
  editor: Editor
  attendance: TeamAttendanceMember | undefined
  projects: Project[]
  onOpenProject: (id: string) => void
}) {
  const presence = presenceChip(attendance)
  const kpi = editor.metrics

  return (
    <div className="card space-y-4">
      {/* Editor header + presensi */}
      <div className="flex items-start gap-3">
        <Avatar name={editor.full_name} avatar={editor.avatar} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy truncate">{editor.full_name}</p>
          <p className="text-xs text-navy/50 truncate">
            {editor.specialization.map(s => SPEC_LABELS[s] ?? s).join(' · ')}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${presence.tone}`}>
          {presence.label}
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi icon={Star} label="Rating" value={editor.rating.toFixed(1)} />
        <Kpi icon={TrendingUp} label="KPI" value={kpi ? kpi.kpi_average.toFixed(1) : '—'} />
        <Kpi icon={Award} label="Kinerja" value={BAND_LABELS[editor.performance_band]} />
      </div>

      {/* Projects */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-2">Proyek ({projects.length})</p>
        {projects.length === 0 ? (
          <p className="text-sm text-navy/40">Belum ada proyek.</p>
        ) : (
          <ul className="divide-y divide-border">
            {projects.map(p => (
              <li key={p.project_id}>
                <button
                  onClick={() => onOpenProject(p.project_id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 text-left rounded-lg hover:bg-navy-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy truncate">{p.title}</p>
                    <p className="text-xs text-navy/50">{formatCurrency(p.project_value)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                  <ChevronRight className="w-4 h-4 text-navy/30 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-navy/40 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-bold text-navy mt-0.5 leading-tight">{value}</p>
    </div>
  )
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) return <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  return (
    <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}
