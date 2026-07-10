import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Building2, Clock, MapPin, Pencil, Plus, Trash2, Users,
} from 'lucide-react'
import type { JobPosting } from '../../types'
import { useJobPostings, useJobPostingMutations } from '../../hooks/queries/useJobPostings'
import { ApiError } from '../../lib/api'

const WORK_TYPE_LABELS: Record<string, string> = { fulltime: 'Full-time', parttime: 'Part-time' }
const WORK_SYSTEM_LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }

// HR management page for job postings: every /apply application is submitted
// against one of these. Create/edit live on /recruitment/jobs/new|:id/edit.
export default function JobPostingsPage() {
  const { data: jobs = [], isLoading, error } = useJobPostings()
  const { setStatus, remove } = useJobPostingMutations()
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<JobPosting | null>(null)

  const openCount = jobs.filter(j => j.status === 'open').length

  function toggleStatus(job: JobPosting) {
    setActionError(null)
    setStatus.mutate(
      { id: job.job_id, status: job.status === 'open' ? 'closed' : 'open' },
      { onError: err => setActionError(err instanceof ApiError ? err.message : 'Aksi gagal — coba lagi') },
    )
  }

  function runDelete(job: JobPosting) {
    setActionError(null)
    remove.mutate(job.job_id, {
      onSuccess: () => setConfirmDelete(null),
      onError: err => {
        setConfirmDelete(null)
        setActionError(err instanceof ApiError ? err.message : 'Lowongan tidak dapat dihapus — coba lagi')
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/recruitment" className="inline-flex items-center gap-1.5 text-xs font-medium text-navy/50 hover:text-navy transition-colors mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Pipeline Rekrutmen
          </Link>
          <h1 className="text-xl font-bold text-navy tracking-tight">Kelola Lowongan</h1>
          <p className="text-[13px] text-navy/55 mt-0.5">
            {openCount} lowongan terbuka · {jobs.length} total — pelamar memilih salah satu lowongan di halaman /apply.
          </p>
        </div>
        <Link to="/recruitment/jobs/new"
          className="inline-flex items-center gap-2 bg-navy hover:bg-[#032b4a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Buat Lowongan
        </Link>
      </div>

      {actionError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm font-medium text-[#888]">Memuat lowongan…</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm font-medium text-red-600">Gagal memuat lowongan — periksa koneksi API</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-navy/40" />
          </div>
          <p className="text-sm font-medium text-navy/55">Belum ada lowongan — buat lowongan pertama Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {jobs.map(job => (
            <article key={job.job_id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-navy leading-snug truncate">{job.title}</h2>
                  <p className="text-xs text-navy/55 mt-0.5">
                    {[job.position, job.department].filter(Boolean).join(' · ') || 'Posisi belum diisi'}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wide border ${
                  job.status === 'open'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-[#f2f2f2] text-navy/50 border-black/5'
                }`}>
                  {job.status === 'open' ? 'Terbuka' : 'Ditutup'}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-navy/60">
                {job.work_type && <Meta icon={Clock} text={WORK_TYPE_LABELS[job.work_type]} />}
                {job.work_system && <Meta icon={MapPin} text={WORK_SYSTEM_LABELS[job.work_system]} />}
                {job.department && <Meta icon={Building2} text={job.department} />}
                <Meta icon={Users} text={`${job.applicant_count} pelamar`} />
              </div>

              {job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills.slice(0, 4).map(s => (
                    <span key={s} className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-navy/5 text-navy border border-navy/5">{s}</span>
                  ))}
                  {job.required_skills.length > 4 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-navy/50">+{job.required_skills.length - 4}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1 border-t border-black/5">
                <div className="flex items-center gap-1.5 pt-2.5">
                  <Link to={`/recruitment/jobs/${job.job_id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-navy/70 hover:text-navy hover:bg-navy/5 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Ubah
                  </Link>
                  <button type="button" onClick={() => setConfirmDelete(job)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600/80 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
                {/* Open/close switch */}
                <label className="flex items-center gap-2 pt-2.5 cursor-pointer select-none">
                  <span className="text-xs font-medium text-navy/55">{job.status === 'open' ? 'Menerima lamaran' : 'Tidak menerima'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={job.status === 'open'}
                    disabled={setStatus.isPending}
                    onClick={() => toggleStatus(job)}
                    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${
                      job.status === 'open' ? 'bg-emerald-600' : 'bg-[#d8d8d8]'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      job.status === 'open' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="card max-w-sm w-full p-5 space-y-4 bg-white">
            <div>
              <h2 className="text-sm font-bold text-navy">Hapus lowongan?</h2>
              <p className="text-[13px] text-navy/60 mt-1">
                “{confirmDelete.title}” akan dihapus permanen. Lamaran yang sudah masuk tetap tersimpan
                tetapi kehilangan tautan ke lowongan ini.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-navy/60 hover:text-navy hover:bg-navy/5 transition-colors">
                Batal
              </button>
              <button type="button" disabled={remove.isPending} onClick={() => runDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white transition-colors">
                {remove.isPending ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Meta({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3.5 h-3.5 text-navy/40" /> {text}
    </span>
  )
}
