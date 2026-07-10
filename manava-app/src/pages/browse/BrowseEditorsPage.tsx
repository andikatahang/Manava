// Cari Jasa — katalog editor untuk klien: cari nama/keahlian, filter
// departemen, lihat detail keahlian + ulasan di drawer, lalu "Mulai Diskusi"
// membuka ruang proyek draft dengan editor tersebut.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MessageSquare, Search, Star, Users } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { StarRating } from '../../components/ui/StarRating'
import { StatusBadge } from '../../components/ui/Badge'
import { useEditors } from '../../hooks/queries/useEditors'
import { useEditorReviews, useStartBooking } from '../../hooks/queries/useProjectRoom'
import { formatDate } from '../../lib/utils'
import type { Editor } from '../../types'

// Token spesialisasi (snake_case di DB) → label manusiawi.
const SPEC_LABELS: Record<string, string> = {
  product_retouch: 'Retouch Produk',
  portrait_retouch: 'Retouch Portrait',
  background_removal: 'Hapus Background',
  color_correction: 'Koreksi Warna',
  video_edit: 'Video Editing',
  motion_graphics: 'Motion Graphics',
  color_grading: 'Color Grading',
  vfx: 'VFX & Compositing',
}
const specLabel = (token: string) =>
  SPEC_LABELS[token] ?? token.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')

export default function BrowseEditorsPage() {
  const editorsQuery = useEditors()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<string | 'all'>('all')
  const [selected, setSelected] = useState<Editor | null>(null)

  // Hanya editor aktif yang bisa menerima booking.
  const editors = useMemo(
    () => (editorsQuery.data ?? []).filter(e => e.status === 'active'),
    [editorsQuery.data],
  )
  const departments = useMemo(
    () => Array.from(new Set(editors.map(e => e.department))).sort(),
    [editors],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return editors.filter(e => {
      if (department !== 'all' && e.department !== department) return false
      if (!q) return true
      const haystack = [e.full_name, e.department, ...e.specialization.map(specLabel)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [editors, search, department])

  if (editorsQuery.isLoading) return <p className="text-sm text-navy/50">Memuat daftar editor…</p>
  if (editorsQuery.isError) {
    return (
      <p className="text-sm text-red-600">
        Gagal memuat editor — pastikan backend berjalan. ({(editorsQuery.error as Error).message})
      </p>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Pencarian + filter departemen */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-navy/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau keahlian… (mis. color grading)"
            className="input pl-10"
            aria-label="Cari editor"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterChip active={department === 'all'} onClick={() => setDepartment('all')}>
            Semua
          </FilterChip>
          {departments.map(d => (
            <FilterChip key={d} active={department === d} onClick={() => setDepartment(d)}>
              {d}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="text-xs text-navy/45">
        {filtered.length} editor tersedia — pilih editor untuk melihat detail keahlian dan mulai diskusi proyek.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak ada editor yang cocok"
          description="Coba kata kunci lain atau hapus filter departemen."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => (
            <EditorCard key={e.editor_id} editor={e} onDetail={() => setSelected(e)} />
          ))}
        </div>
      )}

      <EditorDetailDrawer editor={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function EditorCard({ editor, onDetail }: { editor: Editor; onDetail: () => void }) {
  const initials = editor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')
  const rating = editor.metrics?.avg_client_rating ?? editor.rating

  return (
    <button onClick={onDetail} className="card text-left flex flex-col hover:border-navy/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-navy text-sm leading-tight truncate">{editor.full_name}</h3>
          <p className="text-xs text-navy/50 mt-0.5 truncate">{editor.department}</p>
        </div>
      </div>

      <div className="mt-3">
        <StarRating value={rating} size={13} />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {editor.specialization.slice(0, 3).map(s => (
          <span key={s} className="text-[11px] font-medium text-navy/70 bg-navy/5 rounded-full px-2 py-0.5">
            {specLabel(s)}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-navy/55">
        <span className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-navy/40" />
          {editor.active_projects} proyek aktif
        </span>
        <span>{editor.completion_rate}% tepat waktu</span>
      </div>
    </button>
  )
}

function EditorDetailDrawer({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const navigate = useNavigate()
  const reviewsQuery = useEditorReviews(editor?.editor_id)
  const startBooking = useStartBooking()

  function handleStart() {
    if (!editor) return
    startBooking.mutate(
      { editor_id: editor.editor_id },
      { onSuccess: project => navigate(`/projects/${project.project_id}`) },
    )
  }

  const metrics = editor?.metrics
  const rating = metrics?.avg_client_rating ?? editor?.rating ?? 0

  return (
    <Drawer
      open={!!editor}
      onClose={onClose}
      title={editor?.full_name ?? ''}
      subtitle={editor ? `${editor.department} · bergabung ${formatDate(editor.onboarded_at)}` : undefined}
      footer={
        <div className="space-y-2">
          {startBooking.isError && (
            <p className="text-xs text-red-600">{(startBooking.error as Error).message}</p>
          )}
          <button
            onClick={handleStart}
            disabled={startBooking.isPending}
            className="btn-primary w-full justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <MessageSquare className="w-4 h-4" />
            {startBooking.isPending ? 'Membuka ruang diskusi…' : 'Mulai Diskusi Proyek'}
          </button>
          <p className="text-[11px] text-navy/45 text-center">
            Diskusikan kebutuhan Anda — editor akan mengirim brief (judul, deskripsi, batas revisi, harga) untuk disetujui.
          </p>
        </div>
      }
    >
      {editor && (
        <div className="space-y-6">
          {/* Ringkasan kinerja */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCell label="Rating Klien" value={rating.toFixed(1)} sub={<StarRating value={rating} size={11} showValue={false} />} />
            <MetricCell label="Tepat Waktu" value={`${metrics?.completion_rate ?? editor.completion_rate}%`} />
            <MetricCell label="Proyek Aktif" value={String(editor.active_projects)} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-navy/50">Band kinerja:</span>
            <StatusBadge status={editor.performance_band} />
          </div>

          {/* Keahlian */}
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-2">
              Keahlian & Spesialisasi
            </h4>
            <div className="flex flex-wrap gap-2">
              {editor.specialization.map(s => (
                <span key={s} className="text-xs font-medium text-navy bg-[#D0F100]/50 border border-[#D0F100] rounded-full px-3 py-1">
                  {specLabel(s)}
                </span>
              ))}
              <span className="text-xs font-medium text-navy/60 bg-navy/5 rounded-full px-3 py-1">
                {editor.department}
              </span>
            </div>
          </section>

          {/* Ulasan */}
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-2">
              Ulasan Klien Terbaru
            </h4>
            {reviewsQuery.isLoading ? (
              <p className="text-xs text-navy/45">Memuat ulasan…</p>
            ) : (reviewsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-navy/45 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> Belum ada ulasan untuk editor ini.
              </p>
            ) : (
              <ul className="space-y-3">
                {reviewsQuery.data!.map(r => (
                  <li key={r.review_id} className="border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating value={r.rating} size={12} />
                      <span className="text-[11px] text-navy/40">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-navy/70 mt-1.5 leading-relaxed">{r.comment}</p>
                    <p className="text-[11px] text-navy/45 mt-1.5">
                      {r.reviewer_name} · {r.project_title}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  )
}

function MetricCell({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-navy leading-none">{value}</p>
      {sub && <div className="flex justify-center mt-1">{sub}</div>}
      <p className="text-[11px] text-navy/50 mt-1.5">{label}</p>
    </div>
  )
}

function FilterChip({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? 'bg-navy text-white shadow-sm hover:bg-navy/90' : 'bg-white text-navy/60 border border-border hover:border-navy/30'}`}
    >
      {children}
    </button>
  )
}
