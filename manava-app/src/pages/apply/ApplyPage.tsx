// Public application form. The applicant only types name/email/phone; the
// profile (age, education, GPA, skills) is AI-extracted from the uploaded CV
// server-side at submission and screened against the vacancy criteria — the
// result is visible to HR on the recruitment pages, not on this form.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, CheckCircle2, ClipboardList, Clock, FileText, MapPin, Upload, X } from 'lucide-react'
import logoDark from '../../assets/logo-dark.png'
import {
  fetchOpenJobPostings, fetchRecruitmentStatus, fetchVacancyCriteria, submitApplication,
  type VacancyCriterion,
} from '../../lib/applications'
import type { JobPosting } from '../../types'
import { ApiError } from '../../lib/api'

const WORK_TYPE_LABELS: Record<string, string> = { fulltime: 'Full-time', parttime: 'Part-time' }
const WORK_SYSTEM_LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }

interface FormState {
  full_name: string
  email: string
  phone: string
  cv_file: File | null
  cv_data: string | null
}

const EMPTY: FormState = { full_name: '', email: '', phone: '', cv_file: null, cv_data: null }

const MAX_CV_BYTES = 5 * 1024 * 1024

// Shown until GET /applications/criteria answers (and if it fails).
const FALLBACK_CRITERIA: VacancyCriterion[] = [
  { label: 'Umur', value: '18–35 tahun' },
  { label: 'Pendidikan', value: 'Minimal D3' },
  { label: 'IPK', value: 'Minimal 3.00' },
  { label: 'Keahlian', value: 'Minimal satu keahlian editing visual yang relevan' },
]

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ApplyPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [criteria, setCriteria] = useState<VacancyCriterion[]>(FALLBACK_CRITERIA)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // null = still checking; the form is hidden until we know for sure so a
  // closed vacancy never flashes an editable form first.
  const [isOpen, setIsOpen] = useState<boolean | null>(null)
  // Open postings; the applicant picks one before the form appears. When the
  // list fails to load or is empty, the form still works without a job link.
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)

  useEffect(() => {
    fetchRecruitmentStatus().then(s => setIsOpen(s.is_open)).catch(() => setIsOpen(true))
    fetchOpenJobPostings()
      .then(list => { setJobs(list); setJobsLoaded(true) })
      .catch(() => setJobsLoaded(true))
  }, [])

  // Criteria follow the chosen job (fallback = generic criteria).
  useEffect(() => {
    fetchVacancyCriteria(selectedJob?.job_id).then(setCriteria).catch(() => {})
  }, [selectedJob])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleCvSelected(file: File | null) {
    if (!file) return
    if (file.size > MAX_CV_BYTES) {
      setErrors(e => ({ ...e, cv_name: 'Ukuran CV maksimal 5MB' }))
      return
    }
    setErrors(({ cv_name: _drop, ...rest }) => rest)
    let cv_data: string
    try {
      cv_data = await readAsDataUrl(file)
    } catch {
      setErrors(e => ({ ...e, cv_name: 'File tidak dapat dibaca — coba lagi' }))
      return
    }
    setForm(f => ({ ...f, cv_file: file, cv_data }))
  }

  function removeCv() {
    setForm(f => ({ ...f, cv_file: null, cv_data: null }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Nama lengkap wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Alamat email tidak valid'
    if (!form.phone.trim()) e.phone = 'Nomor telepon wajib diisi'
    if (!form.cv_file || !form.cv_data) e.cv_name = 'Lampirkan file CV'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate() || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitApplication({
        ...(selectedJob ? { job_id: selectedJob.job_id } : {}),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        cv_name: form.cv_file!.name,
        cv_data: form.cv_data!,
      })
      setSubmitted(true)
    } catch (err: unknown) {
      // 409 = email yang sama masih punya lamaran aktif — tampilkan pesannya
      // apa adanya; guard sisi-klien sengaja dihapus untuk kebutuhan demo.
      setSubmitError(err instanceof ApiError ? err.message : 'Tidak dapat mengirim lamaran — coba lagi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#1a1a1a]" style={{ fontFamily: "'Open Runde', 'Inter', sans-serif" }}>
      {/* Top bar */}
      <header className="border-b border-[#EDEDED] bg-[#FBFBFB]/85 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-[760px] mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain" />
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#596074] hover:text-[#021526] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-12">
        {isOpen === false ? (
          <ClosedView />
        ) : submitted ? (
          <SuccessView email={form.email} />
        ) : jobs.length > 0 && !selectedJob ? (
          /* Step 1 — pick a vacancy before the form appears */
          <>
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0050F8] mb-3">Lowongan Pekerjaan</span>
              <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.03em] text-[#021526] leading-tight"
                style={{ fontFamily: "'Inter Display', sans-serif" }}>
                Gabung Bersama Kami
              </h1>
              <p className="text-[#596074] mt-2 text-[15px]">
                Pilih posisi yang paling sesuai dengan keahlian Anda, lalu lengkapi formulir lamaran.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {jobs.map(job => (
                <button key={job.job_id} type="button" onClick={() => setSelectedJob(job)}
                  className="text-left rounded-2xl border border-[#e0e0e0] bg-white p-5 hover:border-[#021526]/40 hover:shadow-[0_14px_44px_-16px_rgba(2,21,38,0.18)] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#021526]/5 flex items-center justify-center mb-3">
                    <Briefcase className="w-4 h-4 text-[#021526]" />
                  </div>
                  <h2 className="text-[15px] font-semibold text-[#021526] leading-snug">{job.title}</h2>
                  <p className="text-xs text-[#596074] mt-0.5">
                    {[job.position, job.department].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11.5px] text-[#596074]">
                    {job.work_type && (
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {WORK_TYPE_LABELS[job.work_type]}</span>
                    )}
                    {job.work_system && (
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {WORK_SYSTEM_LABELS[job.work_system]}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Step 2 — application form (also the fallback when no postings exist) */
          <>
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0050F8] mb-3">Lowongan Pekerjaan</span>
              <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.03em] text-[#021526] leading-tight"
                style={{ fontFamily: "'Inter Display', sans-serif" }}>
                {selectedJob ? `Lamar: ${selectedJob.title}` : 'Gabung Bersama Kami'}
              </h1>
              <p className="text-[#596074] mt-2 text-[15px]">
                Isi data kontak Anda dan unggah CV. Tim HR Manava akan meninjau lamaran Anda dan
                mengirim undangan interview melalui email.
              </p>
              {selectedJob && (
                <button type="button" onClick={() => setSelectedJob(null)}
                  className="mt-2 text-[13px] font-semibold text-[#0050F8] hover:underline">
                  ← Pilih lowongan lain
                </button>
              )}
              {!jobsLoaded && <p className="text-xs text-[#8a8fa3] mt-2">Memuat daftar lowongan…</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* 1–3. Contact fields */}
              <Field label="Nama Lengkap" error={errors.full_name}>
                <input className="apply-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="mis. Budi Santoso" />
              </Field>

              <Field label="Alamat Email" error={errors.email}>
                <input type="email" className="apply-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="anda@email.com" />
              </Field>

              <Field label="Nomor Telepon" error={errors.phone}>
                <input className="apply-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+62 812-3456-7890" />
              </Field>

              {/* 4. Vacancy criteria */}
              <section aria-labelledby="criteria-heading" className="rounded-2xl border border-[#e0e0e0] bg-white p-5">
                <h2 id="criteria-heading" className="flex items-center gap-2 text-sm font-semibold text-[#021526]">
                  <ClipboardList className="w-4 h-4 text-[#0050F8]" />
                  Kriteria Lowongan
                </h2>
                <dl className="mt-3 space-y-2">
                  {criteria.map(c => (
                    <div key={c.label} className="flex gap-3 text-sm">
                      <dt className="w-24 shrink-0 font-medium text-[#596074]">{c.label}</dt>
                      <dd className="text-[#021526]">{c.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-[#8a8fa3] mt-3">
                  Data di atas tidak perlu diketik — AI membacanya langsung dari CV Anda.
                </p>
              </section>

              {/* 5. CV upload */}
              <Field label="Lampiran CV" error={errors.cv_name}>
                {form.cv_file ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e0e0e0] bg-white">
                    <FileText className="w-4 h-4 text-[#0050F8] shrink-0" />
                    <span className="text-sm text-[#021526] truncate flex-1">{form.cv_file.name}</span>
                    <button type="button" onClick={removeCv} aria-label="Hapus CV" className="text-[#999] hover:text-[#021526]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#cfcfcf] bg-white hover:border-[#021526]/40 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#596074] shrink-0" />
                    <span className="text-sm text-[#596074]">Unggah CV (PDF / DOCX, maks. 5MB)</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={e => handleCvSelected(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </Field>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
              )}

              {/* 6. Submit / cancel */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                <Link to="/"
                  className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-[15px] font-semibold border border-[#e0e0e0] text-[#596074] hover:border-[#021526]/40 hover:text-[#021526] bg-white transition-colors">
                  Batal
                </Link>
                <button type="submit" disabled={submitting}
                  className="flex-[2] inline-flex items-center justify-center gap-2 bg-[#021526] hover:bg-[#032b4a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl text-[15px] transition-colors">
                  {submitting ? 'Mengirim…' : 'Kirim Formulir'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      <style>{`
        .apply-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          background: #fff;
          color: #021526;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .apply-input::placeholder { color: #b9bccb; }
        .apply-input:focus {
          outline: none;
          border-color: rgba(2,21,38,0.4);
          box-shadow: 0 0 0 3px rgba(2,21,38,0.08);
        }
      `}</style>
    </div>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#021526] mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function ClosedView() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-[#f2f2f2] flex items-center justify-center mx-auto mb-5">
        <ClipboardList className="w-8 h-8 text-[#596074]" />
      </div>
      <h1 className="text-2xl font-bold text-[#021526]" style={{ fontFamily: "'Inter Display', sans-serif" }}>
        Pendaftaran Sedang Ditutup
      </h1>
      <p className="text-[#596074] mt-2 max-w-md mx-auto">
        Lowongan Editor saat ini tidak menerima lamaran baru. Silakan kembali lagi nanti.
      </p>
      <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#021526] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
      </Link>
    </div>
  )
}

function SuccessView({ email }: { email: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-[#021526]" style={{ fontFamily: "'Inter Display', sans-serif" }}>Lamaran Terkirim</h1>
      <p className="text-[#596074] mt-2 max-w-md mx-auto">
        Terima kasih atas kesediaan Anda meluangkan waktu untuk melamar dan bergabung bersama kami.
        Lamaran Anda telah kami terima dengan baik dan akan segera ditinjau oleh tim HR Manava.
      </p>
      <p className="text-[#596074] mt-3 max-w-md mx-auto">
        Mohon kesediaannya untuk menunggu; kami akan mengirimkan notifikasi melalui email ke
        {' '}<span className="font-semibold text-[#021526]">{email}</span> apabila Anda terpilih untuk
        mengikuti tahap interview selanjutnya.
      </p>
      <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#021526] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
      </Link>
    </div>
  )
}

