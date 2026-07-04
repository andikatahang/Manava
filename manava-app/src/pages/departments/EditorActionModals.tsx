import { useState } from 'react'
import { Star, TrendingUp, ClipboardCheck, BarChart2 } from 'lucide-react'
import { mockEditorMetrics } from '../../data/mockData'
import { useWarningMutations, type WarningSeverity } from '../../hooks/queries/useWarnings'
import type { Editor } from '../../types'

// Aksi per-editor yang dipakai roster departemen HR Admin: form terbitkan
// peringatan kerja (target terkunci) dan panel detail informasi editor.

const BAND_LABEL: Record<string, string> = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  needs_improvement: 'Perlu Peningkatan',
}
const BAND_STYLE: Record<string, string> = {
  excellent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  good: 'text-blue-700 bg-blue-50 border-blue-200',
  needs_improvement: 'text-amber-700 bg-amber-50 border-amber-200',
}

// Form peringatan dengan target yang sudah terkunci ke editor terpilih —
// memakai API /warnings yang sama dengan halaman Peringatan Kerja.
export function IssueWarningForEditor({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [severity, setSeverity] = useState<WarningSeverity>('sedang')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const mutations = useWarningMutations()

  const SEVERITY_TONE: Record<WarningSeverity, string> = {
    ringan: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
    sedang: 'bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]',
    berat: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
  }

  async function submit() {
    if (!reason.trim()) { setError('Catatan wajib diisi.'); return }
    try {
      await mutations.create.mutateAsync({
        target_user_id: editor.user_id,
        reason: reason.trim(),
        severity,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerbitkan peringatan.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-2.5">
        <EditorAvatar name={editor.full_name} avatar={editor.avatar} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy truncate">{editor.full_name}</p>
          <p className="text-xs text-navy/50 truncate">{editor.email}</p>
        </div>
      </div>

      <div>
        <label className="label">Severity</label>
        <div className="flex flex-wrap gap-2">
          {(['ringan', 'sedang', 'berat'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.06em] border transition-colors ${
                severity === s ? SEVERITY_TONE[s] : 'bg-white text-navy/60 border-black/[0.08] hover:border-navy/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-navy/45 mt-1.5">Berat berlaku 6 bulan · Sedang 3 bulan · Ringan 2 bulan.</p>
      </div>

      <div>
        <label className="label">Catatan <span className="text-red-600">*</span></label>
        <textarea
          rows={4}
          className="input resize-none"
          value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="Jelaskan alasan peringatan — kebijakan yang dilanggar, bukti, dan ekspektasi tindak lanjut."
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onDone}>Batal</button>
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!reason.trim() || mutations.create.isPending}
          onClick={submit}
        >
          {mutations.create.isPending ? 'Menerbitkan…' : 'Terbitkan'}
        </button>
      </div>
    </div>
  )
}

export function EditorDetailInfo({ editor }: { editor: Editor }) {
  const metric = mockEditorMetrics.find(m => m.editor_id === editor.editor_id)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <EditorAvatar name={editor.full_name} avatar={editor.avatar} size="lg" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-navy truncate leading-tight">{editor.full_name}</h3>
          <p className="text-xs text-navy/50 truncate">{editor.email}</p>
          <p className="text-xs text-navy/50">{editor.department}</p>
        </div>
        {metric && (
          <span className={`ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BAND_STYLE[metric.performance_band]}`}>
            {BAND_LABEL[metric.performance_band]}
          </span>
        )}
      </div>

      {metric ? (
        <div className="grid grid-cols-2 gap-2">
          <MetricCell icon={<BarChart2 className="w-3.5 h-3.5 text-navy/50" />} label="KPI Score" value={metric.kpi_average.toFixed(1)} highlight />
          <MetricCell icon={<Star className="w-3.5 h-3.5 text-amber-500" />} label="Rating Klien" value={metric.avg_client_rating.toFixed(1)} />
          <MetricCell icon={<TrendingUp className="w-3.5 h-3.5 text-blue-500" />} label="Penyelesaian" value={`${metric.completion_rate}%`} />
          <MetricCell icon={<ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />} label="Nilai Manajer" value={metric.manager_rating.toFixed(1)} />
        </div>
      ) : (
        <p className="text-sm text-navy/40">Belum ada data KPI untuk editor ini.</p>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Spesialisasi</p>
        <div className="flex flex-wrap gap-1.5">
          {editor.specialization.map(s => (
            <span key={s} className="text-[11px] font-medium text-navy/60 bg-navy/5 px-2 py-0.5 rounded">
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCell({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${highlight ? 'border-navy/20 bg-navy/[0.04]' : 'border-border'}`}>
      <p className="text-[10px] uppercase tracking-wider text-navy/40 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-bold text-navy mt-0.5 leading-tight">{value}</p>
    </div>
  )
}

export function EditorAvatar({ name, avatar, size = 'md' }: { name: string; avatar?: string; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9'
  if (avatar) return <img src={avatar} alt="" className={`${cls} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${cls} rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0`}>
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}
