import { useNavigate } from 'react-router-dom'
import { Building2, Star, TrendingUp, Award, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/page/PageHeader'
import { formatCurrency } from '../../lib/utils'
import { mockDepartments, mockEditors, mockProjects, mockLeaveRequests, mockUsers } from '../../data/mockData'
import type { Department, Editor, UserRole } from '../../types'

const TODAY = '2026-06-26'
const CLOCK_INS = ['08:00', '08:05', '07:58', '08:12', '08:03']

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

type Presence = { label: string; time?: string; tone: 'emerald' | 'blue' }

// Presensi today: on leave (from real leave data) → Cuti/Izin, otherwise present
// with a deterministic clock-in (no per-editor attendance feed in this build).
function presenceFor(editor: Editor, idx: number): Presence {
  const leave = mockLeaveRequests.find(l =>
    l.requester_name === editor.full_name && l.requester_role === 'editor' &&
    l.status !== 'rejected' && l.start_date <= TODAY && TODAY <= l.end_date,
  )
  if (leave) return { label: leave.leave_type === 'cuti' ? 'Cuti' : 'Izin', tone: 'blue' }
  return { label: 'Hadir', time: CLOCK_INS[idx % CLOCK_INS.length], tone: 'emerald' }
}

// The Admin Manager's own department hub — editors + their presensi, KPI, projects.
export function ManagerDepartmentView({ role, embedded = false }: { role: UserRole; embedded?: boolean }) {
  const navigate = useNavigate()
  const managerId = mockUsers.admin_manager.user_id
  const mine = mockDepartments.filter(d => d.manager_id === managerId)
  const departments = mine.length ? mine : mockDepartments.slice(0, 1)

  return (
    <div className="space-y-6 max-w-3xl">
      {!embedded && (
        <PageHeader
          eyebrow="Departemen Saya"
          title="Departemen"
          description="Editor di departemen Anda beserta presensi, KPI, dan proyeknya — dalam satu tempat."
          role={role}
        />
      )}
      {departments.map(dep => (
        <DepartmentBlock key={dep.id} department={dep} onOpenProject={id => navigate(`/projects/${id}`)} />
      ))}
    </div>
  )
}

function DepartmentBlock({ department, onOpenProject }: { department: Department; onOpenProject: (id: string) => void }) {
  const editors = department.member_ids
    .map(id => mockEditors.find(e => e.editor_id === id))
    .filter((e): e is Editor => Boolean(e))

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
        editors.map((e, i) => <EditorHubCard key={e.editor_id} editor={e} idx={i} onOpenProject={onOpenProject} />)
      )}
    </section>
  )
}

function EditorHubCard({ editor, idx, onOpenProject }: { editor: Editor; idx: number; onOpenProject: (id: string) => void }) {
  const projects = mockProjects.filter(p => p.editor_id === editor.editor_id)
  const presence = presenceFor(editor, idx)
  const presenceTone = presence.tone === 'emerald'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-blue-700 bg-blue-50 border-blue-200'

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
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${presenceTone}`}>
          {presence.label}{presence.time ? ` · ${presence.time}` : ''}
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi icon={Star} label="Rating" value={editor.rating.toFixed(1)} />
        <Kpi icon={TrendingUp} label="Selesai" value={`${editor.completion_rate}%`} />
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
