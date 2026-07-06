import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, User, GraduationCap, Sparkles, CalendarClock,
  FileText, Download, CheckCircle2, XCircle, Send, KeyRound, Copy,
} from 'lucide-react'
import { formatDate, formatDateTime } from '../../lib/utils'
import {
  fetchCvBlob, STATUS_LABELS,
  type ApplicationStatus, type CreatedAccount, type InterviewDetails, type MailResult,
} from '../../lib/applications'
import { useApplication, useApplicationMutations } from '../../hooks/queries/useApplications'
import { ApiError } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'

const STATUS_CHIP: Record<ApplicationStatus, string> = {
  new:       'bg-amber-50 text-amber-700 border-amber-200',
  interview: 'bg-navy-50 text-navy border-navy/15',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
}

// Candidate review page (no popups): application data, CV preview, AI summary
// and the stage actions — Shortlist / Approve / Reject.
export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: app, isLoading, error } = useApplication(id)
  const { shortlist, approve, reject } = useApplicationMutations(id ?? '')
  const [account, setAccount] = useState<CreatedAccount | null>(null)
  const [mailStatus, setMailStatus] = useState<MailResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [interviewOpen, setInterviewOpen] = useState(false)

  const busy = shortlist.isPending || approve.isPending || reject.isPending

  function run(action: 'approve' | 'reject') {
    setActionError(null)
    const onError = (err: unknown) =>
      setActionError(err instanceof ApiError ? err.message : 'Aksi gagal — coba lagi')
    if (action === 'approve') {
      approve.mutate(undefined, {
        onSuccess: r => { setAccount(r.account); setMailStatus(r.email) },
        onError,
      })
    } else {
      reject.mutate(undefined, { onError })
    }
  }

  function submitInterview(details: InterviewDetails) {
    setActionError(null)
    shortlist.mutate(details, {
      onSuccess: r => { setInterviewOpen(false); setMailStatus(r.email) },
      onError: err => {
        setInterviewOpen(false)
        setActionError(err instanceof ApiError ? err.message : 'Aksi gagal — coba lagi')
      },
    })
  }

  if (isLoading) {
    return <PageShell><p className="text-sm text-[#888] py-16 text-center">Memuat kandidat…</p></PageShell>
  }
  if (error || !app) {
    return (
      <PageShell>
        <p className="text-sm text-red-600 py-16 text-center">Kandidat tidak ditemukan.</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0050F8] mb-1.5">Detail Kandidat</p>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-navy" style={{ fontFamily: "'Inter Display', sans-serif" }}>
            {app.full_name}
          </h1>
          <p className="text-sm text-navy/55 mt-1">Melamar {formatDate(app.submitted_at)}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </span>
      </div>

      {/* Delivery status of the last real SMTP send (shortlist / approve) */}
      {mailStatus && (
        mailStatus.delivered ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5 text-[13px] text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Email berhasil terkirim ke {app.email}.
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-3.5 text-[13px] text-amber-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            Email TIDAK terkirim ({mailStatus.error ?? 'gagal'}) — sampaikan ke kandidat secara manual.
          </div>
        )
      )}

      {/* Account created panel — shown once right after approval */}
      {account && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
          <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Akun editor berhasil dibuat
          </p>
          <p className="text-[13px] text-navy/70">
            Kredensial sementara juga dikirim ke email kandidat (lihat status di atas). Panel ini hanya
            ditampilkan sekali sebagai cadangan. Role default <span className="font-semibold">Editor</span>;
            data dapat diubah dari halaman Users.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <Credential label="Username" value={account.username} />
            <Credential label="Email" value={account.email} />
            <Credential label="Password Sementara" value={account.temp_password} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Left column — application data + CV */}
        <div className="space-y-5">
          <section className="card p-5 space-y-5">
            <h2 className="text-sm font-semibold text-navy">Data Lamaran</h2>
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3 text-sm">
              <Fact icon={<Mail className="w-4 h-4" />} label="Email" value={app.email} />
              <Fact icon={<Phone className="w-4 h-4" />} label="No. Handphone" value={app.phone} />
              <Fact icon={<User className="w-4 h-4" />} label="Usia" value={`${app.age} tahun`} />
              <Fact icon={<GraduationCap className="w-4 h-4" />} label="Pendidikan" value={app.education} />
              <Fact icon={<Sparkles className="w-4 h-4" />} label="IPK" value={app.gpa.toFixed(2)} />
              <Fact icon={<CalendarClock className="w-4 h-4" />} label="Tahun Lulus" value={String(app.graduation_year)} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-navy mb-2">Skill</p>
              <div className="flex flex-wrap gap-2">
                {app.skills.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-navy-50 text-navy">{s}</span>
                ))}
              </div>
            </div>
          </section>

          <CvSection id={app.application_id} name={app.cv_name} mime={app.cv_mime} />

          {app.invited_at && app.interview_email && (
            <section className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
                <Send className="w-4 h-4" /> Undangan Interview Terkirim
              </h2>
              <p className="text-xs text-navy/55">Email undangan untuk {app.email} · {formatDateTime(app.invited_at)}</p>
              <pre className="text-[12.5px] leading-relaxed text-navy/75 bg-primary-200 border border-border rounded-xl p-4 whitespace-pre-wrap font-sans">
                {app.interview_email}
              </pre>
            </section>
          )}
        </div>

        {/* Right column — AI summary + actions */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
            <p className="text-[13px] font-semibold text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Ringkasan AI
            </p>
            <p className="text-sm text-navy/75 leading-relaxed">{app.ai_summary}</p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 mb-1.5">Keahlian Utama</p>
              <div className="flex flex-wrap gap-1.5">
                {app.skills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-emerald-700 border border-emerald-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-navy">Keputusan</h2>
            {actionError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
            )}

            {app.status === 'new' && (
              <>
                <p className="text-[13px] text-navy/60">
                  Shortlist akan otomatis mengirim email undangan interview (template) ke kandidat.
                </p>
                <button className="btn-primary w-full justify-center" disabled={busy} onClick={() => setInterviewOpen(true)}>
                  <Send className="w-4 h-4" /> {shortlist.isPending ? 'Mengirim…' : 'Shortlist & Undang Interview'}
                </button>
                <RejectButton busy={busy} pending={reject.isPending} onClick={() => run('reject')} />
              </>
            )}

            {app.status === 'interview' && (
              <>
                <p className="text-[13px] text-navy/60">
                  Setelah interview: setujui untuk membuat akun editor otomatis dari data lamaran, atau tolak kandidat.
                </p>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  disabled={busy}
                  onClick={() => run('approve')}
                >
                  <CheckCircle2 className="w-4 h-4" /> {approve.isPending ? 'Membuat akun…' : 'Approve & Buat Akun'}
                </button>
                <RejectButton busy={busy} pending={reject.isPending} onClick={() => run('reject')} />
              </>
            )}

            {app.status === 'approved' && (
              <p className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                Kandidat diterima {app.decided_at ? formatDate(app.decided_at) : ''} — akun editor sudah dibuat.
              </p>
            )}
            {app.status === 'rejected' && (
              <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                Kandidat ditolak {app.decided_at ? formatDate(app.decided_at) : ''}.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Interview form pop up — shown when HR shortlists a candidate */}
      <Modal open={interviewOpen} onClose={() => setInterviewOpen(false)} title="Kirim Undangan Interview" size="md">
        <InterviewForm
          applicantName={app.full_name}
          submitting={shortlist.isPending}
          onSubmit={submitInterview}
        />
      </Modal>
    </PageShell>
  )
}

// Interview invitation form: applicant name is locked; interviewer + method
// (address required for offline) feed the templated email.
function InterviewForm({
  applicantName, submitting, onSubmit,
}: {
  applicantName: string
  submitting: boolean
  onSubmit: (details: InterviewDetails) => void
}) {
  const [interviewer, setInterviewer] = useState('')
  const [mode, setMode] = useState<'online' | 'offline'>('online')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (interviewer.trim().length < 2) e.interviewer = 'Nama interviewer wajib diisi'
    if (mode === 'offline' && location.trim().length < 5) e.location = 'Alamat interview wajib diisi'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    onSubmit({
      interviewer: interviewer.trim(),
      mode,
      ...(mode === 'offline' ? { location: location.trim() } : {}),
    })
  }

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-[13px] font-medium text-navy mb-1.5">Nama Pelamar</label>
        <input className={`${inputCls} bg-primary-200 text-navy/60 cursor-not-allowed`} value={applicantName} disabled />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-navy mb-1.5">Nama Interviewer</label>
        <input
          className={inputCls}
          value={interviewer}
          onChange={e => setInterviewer(e.target.value)}
          placeholder="mis. Eko Manager"
        />
        {errors.interviewer && <p className="text-xs text-red-600 mt-1">{errors.interviewer}</p>}
      </div>

      <div>
        <label className="block text-[13px] font-medium text-navy mb-1.5">Metode Interview</label>
        <div className="grid grid-cols-2 gap-2">
          {(['online', 'offline'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                mode === m
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-navy/60 border-border hover:border-navy/40'
              }`}
            >
              {m === 'online' ? 'Online' : 'Offline'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'offline' && (
        <div>
          <label className="block text-[13px] font-medium text-navy mb-1.5">Alamat Interview</label>
          <input
            className={inputCls}
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="mis. Kantor Manava, Jl. Kaliurang KM 14, Sleman"
          />
          {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
        </div>
      )}

      <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
        <Send className="w-4 h-4" /> {submitting ? 'Mengirim…' : 'Kirim Undangan'}
      </button>
    </form>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Link to="/recruitment" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/55 hover:text-navy transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Rekrutmen
      </Link>
      {children}
    </div>
  )
}

function RejectButton({ busy, pending, onClick }: { busy: boolean; pending: boolean; onClick: () => void }) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition-colors"
      disabled={busy}
      onClick={onClick}
    >
      <XCircle className="w-4 h-4" /> {pending ? 'Menolak…' : 'Reject'}
    </button>
  )
}

// CV attachment: fetches the binary with auth and previews PDFs inline; other
// formats fall back to download-only.
function CvSection({ id, name, mime }: { id: string; name: string; mime: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    fetchCvBlob(id)
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: mime }))
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, mime])

  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
          <FileText className="w-4 h-4" /> Lampiran CV
        </h2>
        {url && (
          <a href={url} download={name}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline">
            <Download className="w-3.5 h-3.5" /> Unduh
          </a>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-primary-200">
        <FileText className="w-4 h-4 text-[#0050F8] shrink-0" />
        <span className="text-sm text-navy truncate">{name}</span>
      </div>
      {failed ? (
        <p className="text-xs text-red-600">Gagal memuat file CV.</p>
      ) : mime === 'application/pdf' && url ? (
        <iframe src={url} title={`CV ${name}`} className="w-full h-[420px] rounded-xl border border-border bg-white" />
      ) : !url ? (
        <p className="text-xs text-navy/50">Memuat pratinjau…</p>
      ) : (
        <p className="text-xs text-navy/50">Pratinjau tidak tersedia untuk format ini — gunakan tombol Unduh.</p>
      )}
    </section>
  )
}

function Credential({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="bg-white border border-emerald-200 rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/45">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy truncate font-mono">{value}</p>
        <button type="button" onClick={copy} className="text-navy/40 hover:text-navy shrink-0" title="Salin">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
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
