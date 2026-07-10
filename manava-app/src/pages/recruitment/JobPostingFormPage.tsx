import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { WorkSystem, WorkType } from '../../types'
import { useJobPostings, useJobPostingMutations } from '../../hooks/queries/useJobPostings'
import type { JobPostingInput } from '../../lib/applications'
import { ApiError } from '../../lib/api'

// Mirrors SKILL_OPTIONS / EDUCATION_LEVELS in the API's screening module —
// job criteria must stay a subset of what the CV screening can detect.
const SKILL_OPTIONS = [
  'Product Retouch', 'Color Correction', 'Portrait Retouch', 'BG Removal',
  'Video Edit', 'Color Grading', 'Motion Graphics', 'VFX',
] as const
const EDUCATION_LEVELS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'] as const

interface FormState {
  title: string
  department: string
  position: string
  work_type: WorkType
  work_system: WorkSystem
  description: string
  min_education: string
  min_gpa: string
  required_skills: string[]
  required_experience: string
}

const EMPTY: FormState = {
  title: '', department: '', position: '',
  work_type: 'fulltime', work_system: 'onsite',
  description: '', min_education: 'D3', min_gpa: '3.00',
  required_skills: [], required_experience: '',
}

// Create/edit form for a job posting (HR only). Edit mode prefills from the
// cached list — the list query is the single source for both pages.
export default function JobPostingFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: jobs = [], isLoading } = useJobPostings()
  const { create, update } = useJobPostingMutations()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const editing = isEdit ? jobs.find(j => j.job_id === id) : undefined

  useEffect(() => {
    if (!isEdit || !editing || hydrated) return
    setForm({
      title: editing.title,
      department: editing.department ?? '',
      position: editing.position ?? '',
      work_type: editing.work_type ?? 'fulltime',
      work_system: editing.work_system ?? 'onsite',
      description: editing.description ?? '',
      min_education: editing.min_education ?? 'D3',
      min_gpa: editing.min_gpa != null ? editing.min_gpa.toFixed(2) : '3.00',
      required_skills: editing.required_skills,
      required_experience: editing.required_experience ?? '',
    })
    setHydrated(true)
  }, [isEdit, editing, hydrated])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleSkill(skill: string) {
    setForm(f => ({
      ...f,
      required_skills: f.required_skills.includes(skill)
        ? f.required_skills.filter(s => s !== skill)
        : [...f.required_skills, skill],
    }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (form.title.trim().length < 2) e.title = 'Judul lowongan wajib diisi'
    if (form.department.trim().length < 2) e.department = 'Departemen wajib diisi'
    if (form.position.trim().length < 2) e.position = 'Jabatan wajib diisi'
    const gpa = Number(form.min_gpa)
    if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) e.min_gpa = 'IPK harus antara 0 dan 4'
    if (form.required_skills.length === 0) e.required_skills = 'Pilih minimal satu keahlian'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitError(null)
    const input: JobPostingInput = {
      title: form.title.trim(),
      department: form.department.trim(),
      position: form.position.trim(),
      work_type: form.work_type,
      work_system: form.work_system,
      description: form.description.trim() || null,
      min_education: form.min_education,
      min_gpa: Number(form.min_gpa),
      required_skills: form.required_skills,
      required_experience: form.required_experience.trim() || null,
      specialization: form.required_skills,
    }
    const onError = (err: unknown) =>
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal menyimpan lowongan — coba lagi')
    const onSuccess = () => navigate('/recruitment/jobs')

    if (isEdit && id) update.mutate({ id, input }, { onSuccess, onError })
    else create.mutate({ ...input, status: 'open' }, { onSuccess, onError })
  }

  const busy = create.isPending || update.isPending

  if (isEdit && !isLoading && !editing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm font-medium text-navy/55">Lowongan tidak ditemukan.</p>
        <Link to="/recruitment/jobs" className="text-sm font-semibold text-navy hover:underline">Kembali ke daftar lowongan</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/recruitment/jobs" className="inline-flex items-center gap-1.5 text-xs font-medium text-navy/50 hover:text-navy transition-colors mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Kelola Lowongan
        </Link>
        <h1 className="text-xl font-bold text-navy tracking-tight">{isEdit ? 'Ubah Lowongan' : 'Buat Lowongan Baru'}</h1>
        <p className="text-[13px] text-navy/55 mt-0.5">
          Kriteria di bawah dipakai AI untuk menyaring CV pelamar lowongan ini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-5" noValidate>
        <Field label="Judul Lowongan" error={errors.title}>
          <input className="job-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="mis. Editor Video Senior" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Departemen" error={errors.department}>
            <input className="job-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="mis. Video Editing" />
          </Field>
          <Field label="Jabatan" error={errors.position}>
            <input className="job-input" value={form.position} onChange={e => set('position', e.target.value)} placeholder="mis. Senior Editor" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipe Kerja">
            <select className="job-input" value={form.work_type} onChange={e => set('work_type', e.target.value as WorkType)}>
              <option value="fulltime">Full-time</option>
              <option value="parttime">Part-time</option>
            </select>
          </Field>
          <Field label="Sistem Kerja">
            <select className="job-input" value={form.work_system} onChange={e => set('work_system', e.target.value as WorkSystem)}>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </Field>
        </div>

        <Field label="Deskripsi (opsional)">
          <textarea className="job-input min-h-24 resize-y" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Ringkasan tanggung jawab dan ekspektasi peran…" />
        </Field>

        <div className="pt-1 border-t border-black/5">
          <p className="text-[13px] font-semibold text-navy pt-4 mb-3">Kriteria Pelamar</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Pendidikan Minimal">
              <select className="job-input" value={form.min_education} onChange={e => set('min_education', e.target.value)}>
                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="IPK Minimal" error={errors.min_gpa}>
              <input className="job-input" inputMode="decimal" value={form.min_gpa} onChange={e => set('min_gpa', e.target.value)} placeholder="3.00" />
            </Field>
            <Field label="Pengalaman (opsional)">
              <input className="job-input" value={form.required_experience} onChange={e => set('required_experience', e.target.value)} placeholder="mis. 2 tahun" />
            </Field>
          </div>
        </div>

        <Field label="Keahlian yang Dibutuhkan" error={errors.required_skills}>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(s => {
              const active = form.required_skills.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleSkill(s)} aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
                    active
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-navy/65 border-black/10 hover:border-navy/30 hover:text-navy'
                  }`}>
                  {s}
                </button>
              )
            })}
          </div>
        </Field>

        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Link to="/recruitment/jobs"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-black/10 text-navy/60 hover:text-navy hover:border-navy/30 transition-colors">
            Batal
          </Link>
          <button type="submit" disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-navy hover:bg-[#032b4a] disabled:opacity-60 text-white transition-colors">
            {busy ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Terbitkan Lowongan'}
          </button>
        </div>
      </form>

      <style>{`
        .job-input {
          width: 100%;
          padding: 9px 13px;
          font-size: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          background: #fff;
          color: #021526;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .job-input::placeholder { color: #b9bccb; }
        .job-input:focus {
          outline: none;
          border-color: rgba(2,21,38,0.4);
          box-shadow: 0 0 0 3px rgba(2,21,38,0.08);
        }
      `}</style>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-navy mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
