import { Briefcase, CalendarDays, CheckCircle2, Building2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { StarRating } from '../../components/ui/StarRating'
import { EDITOR_CAPACITY } from '../../data/mockData'
import { getInitials } from '../../lib/utils'
import { SPEC_LABELS } from './specializations'
import { isAtCapacity, isAvailable } from './capacity'
import type { Editor } from '../../types'

const BAND_LABELS: Record<Editor['performance_band'], string> = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  needs_improvement: 'Perlu Peningkatan',
}

interface EditorDetailModalProps {
  /** Editor being viewed; `null` keeps the modal closed. */
  editor: Editor | null
  reviewCount: number
  onClose: () => void
  /** Hands off to the booking flow for this editor. */
  onBook: (editor: Editor) => void
}

export function EditorDetailModal({ editor, reviewCount, onClose, onBook }: EditorDetailModalProps) {
  if (!editor) return null

  const available = isAvailable(editor)
  const slotsLeft = Math.max(EDITOR_CAPACITY - editor.active_projects, 0)
  const availability = editor.status !== 'active'
    ? { label: 'Nonaktif', cls: 'bg-gray-100 text-gray-600' }
    : isAtCapacity(editor)
      ? { label: 'Penuh', cls: 'bg-amber-50 text-amber-700' }
      : { label: 'Tersedia', cls: 'bg-emerald-50 text-emerald-700' }

  return (
    <Modal open onClose={onClose} title="Detail Editor" size="sm">
      <div className="space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          {editor.avatar ? (
            <img
              src={editor.avatar}
              alt={editor.full_name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center text-white text-lg font-bold">
              {getInitials(editor.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-navy truncate">{editor.full_name}</h4>
            <p className="text-[13px] text-navy/50 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {editor.department}
            </p>
            <div className="mt-1">
              <StarRating value={editor.rating} count={reviewCount} size={13} />
            </div>
          </div>
          <span className={`ml-auto shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${availability.cls}`}>
            {availability.label}
          </span>
        </div>

        {/* Specializations */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40 mb-2">Keahlian</p>
          <div className="flex flex-wrap gap-1.5">
            {editor.specialization.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-navy-50 text-navy text-[12px] font-medium">
                {SPEC_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl border border-border bg-[#fbfbfb] p-3">
            <p className="text-navy/40 flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Penyelesaian</p>
            <p className="font-semibold text-navy">{editor.completion_rate}% tepat waktu</p>
            <p className="text-navy/40 text-[12px] mt-0.5">Kinerja: {BAND_LABELS[editor.performance_band]}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#fbfbfb] p-3">
            <p className="text-navy/40 flex items-center gap-1.5 mb-1"><Briefcase className="w-3.5 h-3.5" /> Kapasitas</p>
            <p className="font-semibold text-navy">{editor.active_projects}/{EDITOR_CAPACITY} proyek aktif</p>
            <p className="text-navy/40 text-[12px] mt-0.5">{slotsLeft} slot tersisa</p>
          </div>
        </div>

        <p className="text-[12px] text-navy/40 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> Bergabung sejak {new Date(editor.onboarded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-[13px] font-semibold text-navy/60 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={!available}
            onClick={() => onBook(editor)}
            className="flex-1 h-10 rounded-xl bg-navy text-white text-[13px] font-semibold hover:bg-[#032b4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {available ? 'Pesan Editor' : 'Tidak tersedia'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
