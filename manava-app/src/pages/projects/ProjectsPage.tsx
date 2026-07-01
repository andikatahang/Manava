import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, User, Building2, Calendar, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockProjects } from '../../data/mockData'
import type { Project, ProjectStatus, UserRole } from '../../types'
import { ClientProjectCard } from './ClientProjectCard'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draf',
  awaiting_dp: 'Menunggu DP',
  in_progress: 'Berjalan',
  in_review: 'Ditinjau',
  revision: 'Revisi',
  disputed: 'Disengketakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const ALL_STATUSES: ProjectStatus[] = [
  'in_progress', 'in_review', 'revision', 'disputed', 'awaiting_dp', 'completed', 'cancelled',
]

// ─── Client / Editor Grid View ───────────────────────────────────────────────

function ProjectsHubView({
  role,
  filtered,
  filter,
  setFilter,
}: {
  role: UserRole
  filtered: Project[]
  filter: ProjectStatus | 'all'
  setFilter: (v: ProjectStatus | 'all') => void
}) {
  const navigate = useNavigate()
  const isEditor = role === 'editor'

  const total = mockProjects.length
  const cancelled = mockProjects.filter(p => p.status === 'cancelled').length
  const completed = mockProjects.filter(p => p.status === 'completed').length
  const ongoing = total - completed - cancelled
  const needAction = mockProjects.filter(p =>
    ['awaiting_dp', 'in_review', 'disputed'].includes(p.status)
  ).length

  // Status distribution for the portfolio bar (clean data-viz)
  const SEGMENTS: { status: ProjectStatus; color: string }[] = [
    { status: 'in_progress', color: '#2563eb' },
    { status: 'in_review', color: '#021526' },
    { status: 'revision', color: '#d97706' },
    { status: 'awaiting_dp', color: '#f59e0b' },
    { status: 'disputed', color: '#dc2626' },
    { status: 'completed', color: '#16a34a' },
  ]
  const segData = SEGMENTS
    .map(s => ({ ...s, count: mockProjects.filter(p => p.status === s.status).length }))
    .filter(s => s.count > 0)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Portfolio summary */}
      <div className="card no-hover">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex gap-7 sm:pr-7 sm:border-r border-border">
            <SummaryStat value={needAction} label="Perlu tindakan" accent="text-amber-600" />
            <SummaryStat value={ongoing} label="Berjalan" accent="text-blue-600" />
            <SummaryStat value={completed} label="Selesai" accent="text-emerald-600" />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-semibold text-navy/45 uppercase tracking-wider">Portofolio proyek</span>
              <span className="text-xs text-navy/45">{total} total</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-navy/5">
              {segData.map(s => (
                <div
                  key={s.status}
                  style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
                  title={`${STATUS_LABELS[s.status]}: ${s.count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {segData.map(s => (
                <span key={s.status} className="inline-flex items-center gap-1.5 text-xs text-navy/60">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {STATUS_LABELS[s.status]} <span className="font-semibold text-navy">{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Semua ({mockProjects.length})
        </FilterChip>
        {ALL_STATUSES.map(s => {
          const count = mockProjects.filter(p => p.status === s).length
          if (!count) return null
          return (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {STATUS_LABELS[s]} ({count})
            </FilterChip>
          )
        })}
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-navy/35">
          <Briefcase className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada proyek</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ClientProjectCard
              key={p.project_id}
              project={p}
              personName={isEditor ? p.client_name : p.editor_name}
              personLabel={isEditor ? 'Klien' : 'Editor'}
              onDetail={pr => navigate(`/projects/${pr.project_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryStat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-navy/50 mt-0.5">{label}</p>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? 'bg-navy text-white shadow-sm hover:bg-navy/90' : 'bg-white text-navy/60 border border-border hover:border-navy/30'}`}
    >
      {children}
    </button>
  )
}

// ─── Manager Grouped List ─────────────────────────────────────────────────────
// One-column list grouped by status. Each row surfaces the team member (editor)
// responsible and a "Lihat Detail" button into the full project detail page.

function TeamProjectRow({ project, onDetail }: { project: Project; onDetail: () => void }) {
  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-navy leading-tight">{project.title}</h3>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-xs text-navy/50 mt-1 line-clamp-1">{project.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-navy/60">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-navy/40" />{project.editor_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-navy/40" />{project.client_name}
          </span>
          {project.started_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-navy/40" />Mulai {formatDate(project.started_at)}
            </span>
          )}
          <span className="font-semibold text-navy">{formatCurrency(project.project_value)}</span>
        </div>
      </div>
      <button
        onClick={onDetail}
        className="btn-secondary text-sm shrink-0 w-full sm:w-auto justify-center"
      >
        Lihat Detail <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function ManagerListView({
  filter,
  setFilter,
}: {
  filter: ProjectStatus | 'all'
  setFilter: (v: ProjectStatus | 'all') => void
}) {
  const navigate = useNavigate()

  const statCounts = {
    active: mockProjects.filter(p => p.status === 'in_progress').length,
    review: mockProjects.filter(p => p.status === 'in_review').length,
    disputed: mockProjects.filter(p => p.status === 'disputed').length,
    completed: mockProjects.filter(p => p.status === 'completed').length,
  }

  // Ordered, non-empty groups honoring the active filter.
  const groups = ALL_STATUSES
    .filter(s => filter === 'all' || s === filter)
    .map(status => ({ status, items: mockProjects.filter(p => p.status === status) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-600">{statCounts.active}</p>
          <p className="text-xs text-navy/60 mt-0.5">Berjalan</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-navy">{statCounts.review}</p>
          <p className="text-xs text-navy/60 mt-0.5">Ditinjau</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-red-600">{statCounts.disputed}</p>
          <p className="text-xs text-navy/60 mt-0.5">Disengketakan</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-600">{statCounts.completed}</p>
          <p className="text-xs text-navy/60 mt-0.5">Selesai</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Semua ({mockProjects.length})
        </FilterChip>
        {ALL_STATUSES.map(s => {
          const count = mockProjects.filter(p => p.status === s).length
          if (!count) return null
          return (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {STATUS_LABELS[s]} ({count})
            </FilterChip>
          )
        })}
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="card text-center py-16 text-navy/35">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada proyek</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <section key={group.status}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-navy">{STATUS_LABELS[group.status]}</h2>
                <span className="text-xs font-medium text-navy/45 bg-navy/5 rounded-full px-2 py-0.5">
                  {group.items.length}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map(p => (
                  <TeamProjectRow
                    key={p.project_id}
                    project={p}
                    onDetail={() => navigate(`/projects/${p.project_id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectsPage({ role }: { role: UserRole }) {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')

  const isClient = role === 'client'
  const isEditor = role === 'editor'

  const filtered = filter === 'all' ? mockProjects : mockProjects.filter(p => p.status === filter)

  // Client and editor get the card-grid hub → per-project detail page.
  if (isClient || isEditor) {
    return <ProjectsHubView role={role} filtered={filtered} filter={filter} setFilter={setFilter} />
  }

  // Manager / superadmin: grouped single-column team roster of projects.
  return <ManagerListView filter={filter} setFilter={setFilter} />
}
