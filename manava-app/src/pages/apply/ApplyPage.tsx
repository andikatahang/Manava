import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Upload, FileText, X } from 'lucide-react'
import logoDark from '../../assets/logo-dark.png'
import {
  submitApplication, hasApplied, markApplied,
  SKILL_OPTIONS, EDUCATION_OPTIONS,
} from '../../lib/applications'
import { ApiError } from '../../lib/api'

interface FormState {
  full_name: string
  email: string
  age: string
  phone: string
  education: string
  gpa: string
  graduation_year: string
  skills: string[]
  cv_file: File | null
}

const EMPTY: FormState = {
  full_name: '', email: '', age: '', phone: '', education: '',
  gpa: '', graduation_year: '', skills: [], cv_file: null,
}

const MAX_CV_BYTES = 5 * 1024 * 1024

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
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [alreadyApplied, setAlreadyApplied] = useState(() => hasApplied())

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleSkill(skill: string) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
    }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Nama lengkap wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Alamat email tidak valid'
    const age = Number(form.age)
    if (!form.age || age < 17 || age > 70) e.age = 'Usia harus antara 17–70'
    if (!form.phone.trim()) e.phone = 'Nomor handphone wajib diisi'
    if (!form.education) e.education = 'Pilih pendidikan terakhir'
    const gpa = Number(form.gpa)
    if (!form.gpa || gpa < 0 || gpa > 4) e.gpa = 'IPK harus antara 0,00–4,00'
    const year = Number(form.graduation_year)
    if (!form.graduation_year || year < 1980 || year > 2026) e.graduation_year = 'Tahun lulus tidak valid'
    if (form.skills.length === 0) e.skills = 'Pilih minimal satu skill'
    if (!form.cv_file) e.cv_name = 'Lampirkan file CV'
    else if (form.cv_file.size > MAX_CV_BYTES) e.cv_name = 'Ukuran CV maksimal 5MB'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate() || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const cv_data = await readAsDataUrl(form.cv_file!)
      await submitApplication({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
        education: form.education,
        gpa: Number(form.gpa),
        graduation_year: Number(form.graduation_year),
        skills: form.skills,
        cv_name: form.cv_file!.name,
        cv_data,
      })
      markApplied()
      setSubmitted(true)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        markApplied()
        setAlreadyApplied(true)
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Tidak dapat mengirim lamaran — coba lagi')
      }
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
        {submitted ? (
          <SuccessView email={form.email} />
        ) : alreadyApplied ? (
          <AlreadyAppliedView />
        ) : (
          <>
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0050F8] mb-3">Lowongan Pekerjaan</span>
              <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.03em] text-[#021526] leading-tight"
                style={{ fontFamily: "'Inter Display', sans-serif" }}>
                Daftar sebagai Editor
              </h1>
              <p className="text-[#596074] mt-2 text-[15px]">
                Lengkapi formulir di bawah. Tim HR Manava akan meninjau lamaran Anda dan mengirim undangan interview melalui email.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field label="Nama Lengkap" error={errors.full_name}>
                <input className="apply-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="mis. Budi Santoso" />
              </Field>

              <Field label="Alamat Email" error={errors.email}>
                <input type="email" className="apply-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="anda@email.com" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Usia" error={errors.age}>
                  <input type="number" min={17} max={70} className="apply-input" value={form.age} onChange={e => set('age', e.target.value)} placeholder="mis. 25" />
                </Field>
                <Field label="Nomor Handphone" error={errors.phone}>
                  <input className="apply-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+62 812-3456-7890" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <Field label="Pendidikan Terakhir" error={errors.education}>
                  <select className="apply-input" value={form.education} onChange={e => set('education', e.target.value)}>
                    <option value="">Pilih…</option>
                    {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="IPK" error={errors.gpa}>
                  <input type="number" step="0.01" min={0} max={4} className="apply-input" value={form.gpa} onChange={e => set('gpa', e.target.value)} placeholder="mis. 3,50" />
                </Field>
                <Field label="Tahun Lulus" error={errors.graduation_year}>
                  <input type="number" min={1980} max={2026} className="apply-input" value={form.graduation_year} onChange={e => set('graduation_year', e.target.value)} placeholder="mis. 2024" />
                </Field>
              </div>

              <Field label="Skill" error={errors.skills}>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SKILL_OPTIONS.map(skill => {
                    const active = form.skills.includes(skill)
                    return (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${active ? 'bg-[#021526] text-white border-[#021526]' : 'bg-white text-[#555] border-[#e0e0e0] hover:border-[#021526]/40'}`}>
                        {skill}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Lampiran CV" error={errors.cv_name}>
                {form.cv_file ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e0e0e0] bg-white">
                    <FileText className="w-4 h-4 text-[#0050F8] shrink-0" />
                    <span className="text-sm text-[#021526] truncate flex-1">{form.cv_file.name}</span>
                    <button type="button" onClick={() => set('cv_file', null)} className="text-[#999] hover:text-[#021526]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#cfcfcf] bg-white hover:border-[#021526]/40 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#596074] shrink-0" />
                    <span className="text-sm text-[#596074]">Unggah CV (PDF / DOC, maks. 5MB)</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={e => set('cv_file', e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </Field>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
              )}

              <button type="submit" disabled={submitting}
                className="w-full justify-center inline-flex items-center gap-2 bg-[#021526] hover:bg-[#032b4a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl text-[15px] transition-colors mt-2">
                {submitting ? 'Mengirim…' : 'Kirim Lamaran'}
              </button>
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#021526] mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
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
        Terima kasih sudah melamar. Tim HR akan meninjau lamaran Anda dan mengirim undangan interview ke
        {' '}<span className="font-semibold text-[#021526]">{email}</span> jika lolos seleksi awal.
      </p>
      <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#021526] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
      </Link>
    </div>
  )
}

function AlreadyAppliedView() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-[#021526]" style={{ fontFamily: "'Inter Display', sans-serif" }}>Anda Sudah Melamar</h1>
      <p className="text-[#596074] mt-2 max-w-md mx-auto">
        Lamaran Anda untuk lowongan ini sudah kami terima. Anda dapat melamar kembali saat ada lowongan baru dibuka.
      </p>
      <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#021526] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
      </Link>
    </div>
  )
}
