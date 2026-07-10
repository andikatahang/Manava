import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Clock, CalendarPlus, CheckCircle2, UserCheck, Megaphone, Briefcase } from 'lucide-react'
import type { UserRole } from '../../types'
import {
  STATUS_LABELS,
  type ApplicationStatus, type JobApplication,
} from '../../lib/applications'
import { useApplications, useRecruitmentStatus, useSetRecruitmentStatus } from '../../hooks/queries/useApplications'
import { ApplicantCard } from './ApplicantCard'

const STATUSES: ApplicationStatus[] = ['new', 'interview', 'approved', 'rejected']

// Flow per rework: New → (Shortlist → Interview) → Approved / Rejected.
// All review actions live on the candidate detail page — no popups here.
export default function RecruitmentPage(_props: { role: UserRole }) {
  const navigate = useNavigate()
  const { data: apps = [], isLoading, error } = useApplications()
  // HR lands on the actionable queue ("new") instead of every status mixed.
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('new')
  // Filter by the job the candidate applied to ('none' = legacy, no job link).
  const [jobFilter, setJobFilter] = useState<string | 'all'>('all')

  const byStatus = statusFilter === 'all' ? apps : apps.filter(a => a.status === statusFilter)
  const visible = jobFilter === 'all'
    ? byStatus
    : byStatus.filter(a => (jobFilter === 'none' ? !a.job_id : a.job_id === jobFilter))

  // Job chips derive from the applications themselves — only jobs that
  // actually have applicants show up as filters.
  const jobOptions = [...new Map(apps.filter(a => a.job).map(a => [a.job!.job_id, a.job!])).values()]
  const hasUnlinked = apps.some(a => !a.job_id)

  const countByStatus: Record<ApplicationStatus, number> = {
    new:       apps.filter(a => a.status === 'new').length,
    interview: apps.filter(a => a.status === 'interview').length,
    approved:  apps.filter(a => a.status === 'approved').length,
    rejected:  apps.filter(a => a.status === 'rejected').length,
  }

  function openDetail(app: JobApplication) {
    navigate(`/recruitment/${app.application_id}`)
  }

  return (
    <div className="space-y-6">

      {/* Manage postings entry point */}
      <div className="flex justify-end">
        <Link to="/recruitment/jobs"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-navy border border-black/10 hover:border-navy/30 bg-white rounded-xl px-4 py-2 transition-colors">
          <Briefcase className="w-4 h-4" /> Kelola Lowongan
        </Link>
      </div>

      <RecruitmentToggle />

      {/* Signal: how many decisions are queued */}
      {(countByStatus.new + countByStatus.interview) > 0 && (
        <div className="rounded-2xl bg-navy text-white px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {countByStatus.new} pelamar baru · {countByStatus.interview} dalam tahap interview
            </p>
            <p className="text-xs text-white/70 mt-0.5">Klik kandidat untuk membuka halaman detail dan mengambil keputusan.</p>
          </div>
        </div>
      )}

      {/* Stat strip — at-a-glance counts */}
      <div className="card p-0 divide-y sm:divide-y-0 sm:divide-x divide-border grid sm:grid-cols-4">
        <StatBox icon={Users}        label="Total"     value={apps.length}             tone="navy" />
        <StatBox icon={Clock}        label="Baru"      value={countByStatus.new}       tone="amber" />
        <StatBox icon={CalendarPlus} label="Interview" value={countByStatus.interview} tone="navy" />
        <StatBox icon={CheckCircle2} label="Diterima"  value={countByStatus.approved}  tone="emerald" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          label={`Semua (${apps.length})`}
        />
        {STATUSES.map(s => (
          <FilterChip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            label={`${STATUS_LABELS[s]} (${countByStatus[s]})`}
          />
        ))}
      </div>

      {/* Job filter chips — shown once applicants are linked to postings */}
      {(jobOptions.length > 0) && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy/40">
            <Briefcase className="w-3.5 h-3.5" /> Lowongan
          </span>
          <FilterChip active={jobFilter === 'all'} onClick={() => setJobFilter('all')} label="Semua" />
          {jobOptions.map(j => (
            <FilterChip
              key={j.job_id}
              active={jobFilter === j.job_id}
              onClick={() => setJobFilter(jobFilter === j.job_id ? 'all' : j.job_id)}
              label={j.title}
            />
          ))}
          {hasUnlinked && (
            <FilterChip
              active={jobFilter === 'none'}
              onClick={() => setJobFilter(jobFilter === 'none' ? 'all' : 'none')}
              label="Tanpa lowongan"
            />
          )}
        </div>
      )}

      {/* Card grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-medium text-[#888]">Memuat pelamar…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-medium text-red-600">Gagal memuat daftar pelamar — periksa koneksi API</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-medium text-[#888]">Belum ada pelamar pada tahap ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(a => (
            <ApplicantCard
              key={a.application_id}
              application={a}
              statusLabel={STATUS_LABELS[a.status]}
              onDetail={openDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// HR switch controlling whether /apply (public form) accepts new submissions.
function RecruitmentToggle() {
  const { data: setting, isLoading } = useRecruitmentStatus()
  const setStatus = useSetRecruitmentStatus()
  const isOpen = setting?.is_open ?? true
  const busy = isLoading || setStatus.isPending

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isOpen ? 'bg-emerald-50' : 'bg-[#f2f2f2]'}`}>
          <Megaphone className={`w-4 h-4 ${isOpen ? 'text-emerald-600' : 'text-navy/40'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">Pendaftaran Lowongan</p>
          <p className="text-xs text-navy/50">
            {isOpen ? 'Terbuka — form /apply menerima lamaran baru.' : 'Ditutup — form /apply menolak lamaran baru.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        disabled={busy}
        onClick={() => setStatus.mutate(!isOpen)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${isOpen ? 'bg-emerald-600' : 'bg-[#d8d8d8]'}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function StatBox({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'navy' | 'amber' | 'emerald'
}) {
  const toneText: Record<typeof tone, string> = { navy: 'text-navy', amber: 'text-amber-600', emerald: 'text-emerald-600' }
  const toneBg:   Record<typeof tone, string> = { navy: 'bg-navy/5', amber: 'bg-amber-50',     emerald: 'bg-emerald-50' }
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneBg[tone]}`}>
        <Icon className={`w-4 h-4 ${toneText[tone]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-navy/45 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold ${toneText[tone]}`}>{value}</p>
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
        active ? 'bg-navy text-white' : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e8e8e8]'
      }`}
    >
      {label}
    </button>
  )
}
