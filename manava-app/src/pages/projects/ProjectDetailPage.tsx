// Halaman detail proyek — fetch dari /projects/:id. Modul proyek (kontrak,
// hasil kerja, escrow, sengketa, revision envelope) belum diaktifkan; halaman
// ini masih menampilkan ringkasan agar routing tetap berfungsi setelah data
// nyata masuk.

import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, User, Building2, Calendar } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { Project, UserRole } from '../../types'

interface ProjectDetail extends Project {
  envelope: unknown | null
  contracts: unknown[]
  revisions: unknown[]
  escrow: unknown | null
}

function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api<ProjectDetail>(`/projects/${id}`),
    enabled: !!id,
  })
}

export default function ProjectDetailPage({ role: _role }: { role: UserRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useProject(id)

  if (query.isLoading) return <p className="text-sm text-navy/50">Memuat proyek…</p>
  if (query.isError || !query.data) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => navigate('/projects')} className="text-sm text-navy/60 hover:text-navy inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar proyek
        </button>
        <div className="card mt-4 text-center py-16 text-navy/40">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Proyek tidak ditemukan</p>
        </div>
      </div>
    )
  }

  const p = query.data
  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/60 hover:text-navy transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar proyek
      </button>

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-navy/40">Proyek</p>
            <h1 className="text-lg font-semibold text-navy leading-tight mt-1">{p.title}</h1>
            <p className="text-sm text-navy/60 mt-2">{p.description}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-border text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-navy/40" />
            <span className="text-navy">{p.editor_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-navy/40" />
            <span className="text-navy">{p.client_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy/40" />
            <span className="text-navy">Dibuat {formatDate(p.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy/40">Nilai</span>
            <span className="font-semibold text-navy">{formatCurrency(p.project_value)}</span>
          </div>
        </div>
      </div>

      <div className="card text-center py-10 text-navy/50 text-sm">
        Modul lanjutan (kontrak, hasil kerja, escrow, sengketa) belum diaktifkan.
      </div>
    </div>
  )
}
