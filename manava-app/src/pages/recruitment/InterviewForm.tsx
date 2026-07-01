import { useState } from 'react'
import { Video, MapPin } from 'lucide-react'
import type { JobApplication, InterviewInfo } from '../../lib/applications'

interface InterviewFormProps {
  application: JobApplication
  onSubmit: (info: InterviewInfo) => void
  onCancel: () => void
}

export function InterviewForm({ application, onSubmit, onCancel }: InterviewFormProps) {
  const [interviewer, setInterviewer] = useState(application.interview?.interviewer ?? '')
  const [datetime, setDatetime] = useState(application.interview?.datetime ?? '')
  const [mode, setMode] = useState<'online' | 'offline'>(application.interview?.mode ?? 'online')
  const [location, setLocation] = useState(application.interview?.location ?? '')
  const [notes, setNotes] = useState(application.interview?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!interviewer.trim()) e.interviewer = 'Nama interviewer wajib diisi'
    if (!datetime) e.datetime = 'Tanggal dan waktu wajib diisi'
    if (mode === 'offline' && !location.trim()) e.location = 'Lokasi wajib diisi untuk interview offline'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    onSubmit({
      interviewer: interviewer.trim(),
      datetime,
      mode,
      ...(mode === 'offline' ? { location: location.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      sent_at: new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Read-only applicant identity */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nama Lengkap">
          <input className="iv-input" value={application.full_name} readOnly disabled />
        </Field>
        <Field label="Alamat Email">
          <input className="iv-input" value={application.email} readOnly disabled />
        </Field>
      </div>

      <Field label="Nama Interviewer" error={errors.interviewer}>
        <input
          className="iv-input"
          value={interviewer}
          onChange={e => setInterviewer(e.target.value)}
          placeholder="mis. Eko Prasetyo (HR Manager)"
        />
      </Field>

      <Field label="Tanggal dan Waktu" error={errors.datetime}>
        <input
          type="datetime-local"
          className="iv-input"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
        />
      </Field>

      <Field label="Tipe Interview">
        <div className="grid grid-cols-2 gap-3 mt-1">
          <ModeOption
            active={mode === 'online'}
            onClick={() => setMode('online')}
            icon={<Video className="w-4 h-4" />}
            label="Online"
            desc="Tautan video"
          />
          <ModeOption
            active={mode === 'offline'}
            onClick={() => setMode('offline')}
            icon={<MapPin className="w-4 h-4" />}
            label="Offline"
            desc="Tatap muka"
          />
        </div>
      </Field>

      {mode === 'offline' && (
        <Field label="Lokasi" error={errors.location}>
          <input
            className="iv-input"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="mis. Kantor Manava, Lt. 3, Jl. Sudirman No. 10, Jakarta"
          />
        </Field>
      )}

      <Field label="Catatan (opsional)">
        <textarea
          className="iv-input"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="mis. Bawa portofolio cetak, fokus wawancara pada studi kasus retouch"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center">Kirim Undangan Interview</button>
        <button type="button" className="btn-secondary flex-1 justify-center" onClick={onCancel}>Batal</button>
      </div>

      <style>{`
        .iv-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          background: #fff;
          color: #021526;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .iv-input:disabled { background: #f5f5f4; color: #596074; cursor: not-allowed; }
        .iv-input::placeholder { color: #b9bccb; }
        .iv-input:focus {
          outline: none;
          border-color: rgba(2,21,38,0.4);
          box-shadow: 0 0 0 3px rgba(2,21,38,0.08);
        }
      `}</style>
    </form>
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

function ModeOption({ active, onClick, icon, label, desc }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
        active ? 'border-navy bg-navy-50 text-navy' : 'border-border bg-white text-navy/60 hover:border-navy/30'
      }`}
    >
      <span className={active ? 'text-navy' : 'text-navy/40'}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span className="block text-xs opacity-70">{desc}</span>
      </span>
    </button>
  )
}

export default InterviewForm
