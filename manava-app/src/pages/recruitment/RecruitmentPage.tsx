import { useState } from 'react'
import {
  Mail, Phone, GraduationCap, CalendarClock, FileText, Sparkles,
  CheckCircle2, XCircle, CalendarPlus, Video, MapPin, User,
  Users, Clock, UserCheck,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { formatDate, formatDateTime } from '../../lib/utils'
import {
  getApplications, updateApplication,
  type JobApplication, type ApplicationStatus, type InterviewInfo,
} from '../../lib/applications'
import type { UserRole } from '../../types'
import { recommendDepartment } from '../../lib/departmentMatch'
import { ApplicantCard } from './ApplicantCard'
import { InterviewForm } from './InterviewForm'
import { PageHeader } from '../../components/page/PageHeader'

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  superadmin:     { eyebrow: 'HR', title: 'Rekrutmen & Onboarding', description: 'Pantau seluruh siklus rekrutmen, DSS scoring, dan konfirmasi onboarding lintas departemen.' },
  hr_admin:       { eyebrow: 'ATS Pipeline', title: 'Rekrutmen & ATS', description: 'Kelola job posting, applicant pipeline, DSS, dan onboarding ke departemen.' },
  admin_manager:  { eyebrow: 'Rekrutmen', title: 'Pelamar Departemen', description: 'Lihat dan diskusikan pelamar untuk departemen Anda — keputusan akhir di HR Admin.' },
  editor:         { eyebrow: 'HR', title: 'Rekrutmen', description: '' },
  client:         { eyebrow: 'HR', title: 'Rekrutmen', description: '' },
  mediator:       { eyebrow: 'HR', title: 'Rekrutmen', description: '' },
  finance:        { eyebrow: 'HR', title: 'Rekrutmen', description: '' },
}

const STATUSES: ApplicationStatus[] = ['pending', 'interview', 'accepted', 'rejected']
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Menunggu', interview: 'Wawancara', accepted: 'Diterima', rejected: 'Ditolak',
}

const CAN_MANAGE: UserRole[] = ['superadmin', 'hr_admin', 'admin_manager']

// Primary card action depends on where the application is in the flow.
function primaryFor(status: ApplicationStatus): string | null {
  if (status === 'pending') return 'Atur Interview'
  if (status === 'interview') return 'Putuskan'
  return null // accepted / rejected are terminal
}

export default function RecruitmentPage({ role }: { role: UserRole }) {
  const canManage = CAN_MANAGE.includes(role)
  const [apps, setApps] = useState<JobApplication[]>(() => getApplications())
  // Managers/HR land on the actionable queue ("pending") instead of seeing
  // every status mixed together — viewers still default to "all".
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(canManage ? 'pending' : 'all')
  const [detail, setDetail] = useState<JobApplication | null>(null)
  const [interviewTarget, setInterviewTarget] = useState<JobApplication | null>(null)

  const visible = statusFilter === 'all' ? apps : apps.filter(a => a.status === statusFilter)

  function refresh(next: JobApplication[]) {
    setApps(next)
    // keep the open detail panel in sync with the freshly-written record
    setDetail(d => (d ? next.find(a => a.id === d.id) ?? null : null))
  }

  function setStatus(id: string, status: ApplicationStatus) {
    refresh(updateApplication(id, { status }))
  }

  function submitInterview(info: InterviewInfo) {
    if (!interviewTarget) return
    refresh(updateApplication(interviewTarget.id, { status: 'interview', interview: info }))
    setInterviewTarget(null)
  }

  // Card primary button: pending → open interview form, interview → open detail to decide.
  function handlePrimary(app: JobApplication) {
    if (app.status === 'pending') setInterviewTarget(app)
    else setDetail(app)
  }

  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.hr_admin

  const countByStatus: Record<ApplicationStatus, number> = {
    pending:   apps.filter(a => a.status === 'pending').length,
    interview: apps.filter(a => a.status === 'interview').length,
    accepted:  apps.filter(a => a.status === 'accepted').length,
    rejected:  apps.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={h.eyebrow} title={h.title} description={h.description} role={role} />

      {/* Signal: managers see how many decisions are queued */}
      {canManage && (countByStatus.pending + countByStatus.interview) > 0 && (
        <div className="rounded-2xl bg-navy text-white px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {countByStatus.pending} pelamar baru · {countByStatus.interview} dalam tahap wawancara
            </p>
            <p className="text-xs text-white/70 mt-0.5">Tinjau, jadwalkan wawancara, lalu putuskan.</p>
          </div>
        </div>
      )}

      {/* Stat strip — at-a-glance counts */}
      <div className="card p-0 divide-y sm:divide-y-0 sm:divide-x divide-border grid sm:grid-cols-4">
        <StatBox icon={Users}        label="Total"        value={apps.length}             tone="navy" />
        <StatBox icon={Clock}        label="Menunggu"     value={countByStatus.pending}   tone="amber" />
        <StatBox icon={CalendarPlus} label="Wawancara"    value={countByStatus.interview} tone="navy" />
        <StatBox icon={CheckCircle2} label="Diterima"     value={countByStatus.accepted}  tone="emerald" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          label={`Semua (${apps.length})`}
        />
        {STATUSES.map(s => {
          const count = apps.filter(a => a.status === s).length
          return (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              label={`${STATUS_LABELS[s]} (${count})`}
            />
          )
        })}
      </div>

      {/* Card grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-medium text-[#888]">Belum ada pelamar pada tahap ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(a => (
            <ApplicantCard
              key={a.id}
              application={a}
              statusLabel={STATUS_LABELS[a.status]}
              primaryLabel={canManage ? primaryFor(a.status) : null}
              terminalTone={a.status === 'accepted' ? 'accepted' : a.status === 'rejected' ? 'rejected' : undefined}
              onDetail={setDetail}
              onPrimary={handlePrimary}
            />
          ))}
        </div>
      )}

      {/* Applicant detail drawer */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.full_name ?? ''}
        subtitle={detail ? `Melamar ${formatDate(detail.submitted_at)}` : undefined}
        headerAction={detail ? <StatusBadge status={detail.status} /> : undefined}
        footer={
          detail && canManage && detail.status !== 'accepted' && detail.status !== 'rejected' ? (
            <div className="flex flex-col gap-2">
              <button
                className="btn-primary w-full justify-center"
                onClick={() => { setInterviewTarget(detail); setDetail(null) }}
              >
                <CalendarPlus className="w-4 h-4" />
                {detail.interview ? 'Ubah Jadwal Interview' : 'Kirim Form Interview'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  onClick={() => setStatus(detail.id, 'accepted')}
                >
                  <CheckCircle2 className="w-4 h-4" /> Terima
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                  onClick={() => setStatus(detail.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4" /> Tolak
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-5">
            {/* On acceptance, AI summarizes skills into a department recommendation. */}
            {detail.status === 'accepted' && <AiDeptRecommendation skills={detail.skills} />}

            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3 text-sm">
              <Fact icon={<Mail className="w-4 h-4" />} label="Email" value={detail.email} />
              <Fact icon={<Phone className="w-4 h-4" />} label="No. Handphone" value={detail.phone} />
              <Fact icon={<User className="w-4 h-4" />} label="Usia" value={`${detail.age} tahun`} />
              <Fact icon={<GraduationCap className="w-4 h-4" />} label="Pendidikan" value={detail.education} />
              <Fact icon={<Sparkles className="w-4 h-4" />} label="IPK" value={detail.gpa.toFixed(2)} />
              <Fact icon={<CalendarClock className="w-4 h-4" />} label="Tahun Lulus" value={String(detail.graduation_year)} />
            </div>

            <div>
              <p className="text-[13px] font-medium text-navy mb-2">Skill</p>
              <div className="flex flex-wrap gap-2">
                {detail.skills.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-navy-50 text-navy">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium text-navy mb-2">Lampiran CV</p>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-primary-200">
                <FileText className="w-4 h-4 text-[#0050F8] shrink-0" />
                <span className="text-sm text-navy truncate">{detail.cv_name}</span>
              </div>
            </div>

            {detail.interview && (
              <div className="rounded-xl border border-navy/15 bg-navy-50 p-4 space-y-2">
                <p className="text-[13px] font-semibold text-navy flex items-center gap-1.5">
                  <CalendarPlus className="w-4 h-4" /> Interview Terjadwal
                </p>
                <div className="text-sm text-navy/70 space-y-1">
                  <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-navy/40" /> {detail.interview.interviewer}</p>
                  <p className="flex items-center gap-2"><CalendarClock className="w-3.5 h-3.5 text-navy/40" /> {formatDateTime(detail.interview.datetime)}</p>
                  <p className="flex items-center gap-2">
                    {detail.interview.mode === 'online'
                      ? <><Video className="w-3.5 h-3.5 text-navy/40" /> Online</>
                      : <><MapPin className="w-3.5 h-3.5 text-navy/40" /> Offline · {detail.interview.location}</>}
                  </p>
                  {detail.interview.notes && (
                    <p className="flex items-start gap-2 pt-1 border-t border-navy/10 mt-2">
                      <FileText className="w-3.5 h-3.5 text-navy/40 mt-0.5 shrink-0" />
                      <span>{detail.interview.notes}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Interview form modal */}
      <Modal open={!!interviewTarget} onClose={() => setInterviewTarget(null)} title="Kirim Form Interview" size="md">
        {interviewTarget && (
          <InterviewForm
            application={interviewTarget}
            onSubmit={submitInterview}
            onCancel={() => setInterviewTarget(null)}
          />
        )}
      </Modal>
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

function AiDeptRecommendation({ skills }: { skills: string[] }) {
  const rec = recommendDepartment(skills)
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
      <p className="text-[13px] font-semibold text-emerald-800 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4" /> Ringkasan AI — Rekomendasi Departemen
      </p>
      {rec ? (
        <>
          <p className="text-sm text-navy/70">
            Berdasarkan keahlian pelamar, kandidat paling cocok untuk departemen{' '}
            <span className="font-semibold text-navy">{rec.department}</span>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rec.matched.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-emerald-700 border border-emerald-200">
                {s}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-navy/70">
          Keahlian pelamar belum cukup spesifik untuk direkomendasikan ke satu departemen — tinjau manual.
        </p>
      )}
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-navy/40 mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-navy/50">{label}</span>
        <span className="block font-medium text-navy truncate">{value}</span>
      </span>
    </div>
  )
}
