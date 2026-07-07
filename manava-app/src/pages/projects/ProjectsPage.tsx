// Proyek — halaman untuk Editor (proyek miliknya), Klien (pesanannya), dan
// Admin Manajer (proyek tim). Data dari /projects yang sudah di-scope per
// role di backend; booking baru dibuat klien dari halaman Cari Editor.

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, User, Building2, Calendar, ChevronRight, Search } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useProjects } from '../../hooks/queries/useProjects'
import { useMe } from '../../hooks/queries/useMe'
import { useEditors } from '../../hooks/queries/useEditors'
import { useDepartments } from '../../hooks/queries/useDepartments'
import type { Project, ProjectStatus, UserRole } from '../../types'

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
  'draft', 'in_progress', 'in_review', 'revision', 'disputed', 'awaiting_dp', 'completed', 'cancelled',
]

export default function ProjectsPage({ role }: { role: UserRole }) {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const meQuery = useMe()
  const projectsQuery = useProjects()
  const editorsQuery = useEditors(role === 'editor' || role === 'admin_manager')
  const departmentsQuery = useDepartments()

  // Scope by role (backend sudah membatasi; filter di sini untuk kepastian UI):
  //   editor        → proyek dengan editor_id = editor row milik akun ini
  //   client        → proyek dengan client_id = user ini
  //   admin_manager → proyek editor di departemen yang ia kelola
  //   lainnya       → semua
  const scoped = useMemo<Project[]>(() => {
    const projects = projectsQuery.data ?? []
    if (role === 'editor') {
      const myEditor = (editorsQuery.data ?? []).find(e => e.user_id === meQuery.data?.user_id)
      if (!myEditor) return []
      return projects.filter(p => p.editor_id === myEditor.editor_id)
    }
    if (role === 'client') {
      return projects.filter(p => p.client_id === meQuery.data?.user_id)
    }
    if (role === 'admin_manager') {
      const myDeptEditorIds = new Set(
        (departmentsQuery.data ?? [])
          .filter(d => d.manager.user_id === meQuery.data?.user_id)
          .flatMap(d => d.member_ids),
      )
      return projects.filter(p => myDeptEditorIds.has(p.editor_id))
    }
    return projects
  }, [projectsQuery.data, editorsQuery.data, departmentsQuery.data, meQuery.data, role])

  const filtered = filter === 'all' ? scoped : scoped.filter(p => p.status === filter)

  if (projectsQuery.isLoading) return <p className="text-sm text-navy/50">Memuat proyek…</p>
  if (projectsQuery.isError) {
    return (
      <p className="text-sm text-red-600">
        Gagal memuat proyek — pastikan backend berjalan. ({(projectsQuery.error as Error).message})
      </p>
    )
  }

  if (role === 'editor' || role === 'client') {
    return (
      <GridView
        role={role}
        projects={scoped}
        filtered={filtered}
        filter={filter}
        setFilter={setFilter}
      />
    )
  }
  return <ManagerListView projects={scoped} filter={filter} setFilter={setFilter} />
}

// Grid bersama Editor & Klien — beda pada lawan transaksi yang ditampilkan
// dan definisi "perlu tindakan":
//   editor → draft (klien menunggu brief), revision (harus dikerjakan ulang), disputed
//   klien  → in_review (preview menunggu tanggapan), selesai belum diulas
function GridView({ role, projects, filtered, filter, setFilter }: {
  role: 'editor' | 'client'
  projects: Project[]
  filtered: Project[]
  filter: ProjectStatus | 'all'
  setFilter: (v: ProjectStatus | 'all') => void
}) {
  const navigate = useNavigate()
  const total = projects.length
  const ongoing = projects.filter(p => ['in_progress', 'in_review', 'revision', 'awaiting_dp', 'draft'].includes(p.status)).length
  const completed = projects.filter(p => p.status === 'completed').length
  const needAction = role === 'editor'
    ? projects.filter(p => ['draft', 'revision', 'disputed'].includes(p.status)).length
    : projects.filter(p => p.status === 'in_review' || (p.status === 'completed' && !p.has_review)).length

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="card no-hover flex items-center justify-between gap-4">
        <div className="flex gap-7">
          <SummaryStat value={needAction} label={role === 'client' ? 'Perlu tanggapan' : 'Perlu tindakan'} accent="text-amber-600" />
          <SummaryStat value={ongoing} label="Berjalan" accent="text-blue-600" />
          <SummaryStat value={completed} label="Selesai" accent="text-emerald-600" />
          <SummaryStat value={total} label="Total" accent="text-navy" />
        </div>
        {role === 'client' && (
          <Link to="/browse-editors" className="btn-primary text-sm shrink-0 hidden sm:inline-flex">
            <Search className="w-4 h-4" /> Cari Editor
          </Link>
        )}
      </div>

      <FilterRow filter={filter} setFilter={setFilter} projects={projects} />

      {filtered.length === 0 ? (
        <EmptyState role={role} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <button
              key={p.project_id}
              onClick={() => navigate(`/projects/${p.project_id}`)}
              className="card text-left flex flex-col hover:border-navy/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={p.status} />
                <span className="text-xs text-navy/40">{formatDate(p.created_at)}</span>
              </div>
              <h3 className="mt-3 font-semibold text-navy text-sm leading-snug line-clamp-2">{p.title}</h3>
              <p className="text-xs text-navy/50 mt-1.5 line-clamp-2">
                {p.description || 'Tahap diskusi — cakupan proyek belum disepakati.'}
              </p>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-navy/50 truncate">
                  {role === 'editor' ? p.client_name : p.editor_name}
                </span>
                {p.project_value > 0
                  ? <span className="text-sm font-bold text-navy">{formatCurrency(p.project_value)}</span>
                  : <span className="text-xs text-navy/40">belum ada harga</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ManagerListView({ projects, filter, setFilter }: {
  projects: Project[]
  filter: ProjectStatus | 'all'
  setFilter: (v: ProjectStatus | 'all') => void
}) {
  const navigate = useNavigate()
  const counts = {
    active: projects.filter(p => p.status === 'in_progress').length,
    review: projects.filter(p => p.status === 'in_review').length,
    disputed: projects.filter(p => p.status === 'disputed').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }
  const groups = ALL_STATUSES
    .filter(s => filter === 'all' || s === filter)
    .map(status => ({ status, items: projects.filter(p => p.status === status) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCell label="Berjalan" value={counts.active} tone="text-blue-600" />
        <StatCell label="Ditinjau" value={counts.review} tone="text-navy" />
        <StatCell label="Disengketakan" value={counts.disputed} tone="text-red-600" />
        <StatCell label="Selesai" value={counts.completed} tone="text-emerald-600" />
      </div>

      <FilterRow filter={filter} setFilter={setFilter} projects={projects} />

      {groups.length === 0 ? (
        <EmptyState />
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
                  <ProjectRow key={p.project_id} project={p} onDetail={() => navigate(`/projects/${p.project_id}`)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectRow({ project, onDetail }: { project: Project; onDetail: () => void }) {
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
      <button onClick={onDetail} className="btn-secondary text-sm shrink-0 w-full sm:w-auto justify-center">
        Lihat Detail <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function FilterRow({ filter, setFilter, projects }: {
  filter: ProjectStatus | 'all'
  setFilter: (v: ProjectStatus | 'all') => void
  projects: Project[]
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
        Semua ({projects.length})
      </FilterChip>
      {ALL_STATUSES.map(s => {
        const count = projects.filter(p => p.status === s).length
        if (!count) return null
        return (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]} ({count})
          </FilterChip>
        )
      })}
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

function SummaryStat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-navy/50 mt-0.5">{label}</p>
    </div>
  )
}

function StatCell({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="card text-center py-4">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-navy/60 mt-0.5">{label}</p>
    </div>
  )
}

function EmptyState({ role }: { role?: 'editor' | 'client' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-navy/35">
      <Briefcase className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">Belum ada proyek</p>
      {role === 'client' ? (
        <>
          <p className="text-xs mt-1 text-navy/45">Mulai dengan mencari editor yang sesuai kebutuhan Anda.</p>
          <Link to="/browse-editors" className="btn-primary text-sm mt-4">
            <Search className="w-4 h-4" /> Cari Editor
          </Link>
        </>
      ) : (
        <p className="text-xs mt-1 text-navy/45">
          {role === 'editor'
            ? 'Booking dari klien akan muncul di sini.'
            : 'Proyek tim akan muncul di sini setelah ada booking.'}
        </p>
      )}
    </div>
  )
}
