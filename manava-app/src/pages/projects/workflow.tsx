import { useState } from 'react'
import {
  Bot, Calendar, CheckCircle2, CreditCard, FileSignature,
  MessageSquare, RotateCcw, Scale, ShieldAlert, Upload,
} from 'lucide-react'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { UserRole } from '../../types'

// ─── Project Offer ────────────────────────────────────────────────────────────

export type OfferStatus = 'pending' | 'accepted' | 'rejected'

export interface ProjectOffer {
  title: string
  description: string
  price: number
  deadline: string
  status: OfferStatus
  created_at: string
}

// Session-scoped store so an offer survives navigating away from the detail
// page and back. Prototype-only — a backend would own this state.
export const projectOffers: Record<string, ProjectOffer> = {}

// ─── Mock AI revision analysis ───────────────────────────────────────────────

export type RevisionType = 'minor' | 'major'

export interface RevisionAnalysis {
  summary: string
  type: RevisionType
  reason: string
}

// Keyword heuristic standing in for the real classifier: requests that touch
// concept/scope read as major, everything else as minor. Deterministic so the
// demo is repeatable.
const MAJOR_PATTERN =
  /(konsep|ganti\s+(latar|background|model|tema)|rombak|ubah\s+total|dari\s+awal|redesign|tambah\s+(objek|adegan|scene)|hapus\s+(objek|adegan)|ulang\s+semua|benar-benar\s+berbeda)/i

export function analyzeFeedback(feedback: string): RevisionAnalysis {
  const type: RevisionType = MAJOR_PATTERN.test(feedback) ? 'major' : 'minor'
  const summary = feedback.trim().replace(/\s+/g, ' ')
  return {
    summary: summary.length > 160 ? `${summary.slice(0, 157)}…` : summary,
    type,
    reason: type === 'minor'
      ? 'Perubahan yang diminta hanya penyesuaian kecil tanpa mengubah konsep keseluruhan.'
      : 'Permintaan menyangkut perubahan konsep atau lingkup di luar kesepakatan awal, bukan sekadar penyesuaian kecil.',
  }
}

// ─── Offer composer (editor) ─────────────────────────────────────────────────

export function OfferComposer({
  open,
  onClose,
  defaultTitle,
  onSend,
}: {
  open: boolean
  onClose: () => void
  defaultTitle: string
  onSend: (offer: ProjectOffer) => void
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [deadline, setDeadline] = useState('')

  const valid = title.trim() !== '' && description.trim() !== '' && Number(price) > 0 && deadline !== ''

  function handleSend() {
    onSend({
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      deadline,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirim Penawaran Proyek">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="offer-title">Judul proyek</label>
          <input id="offer-title" className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="offer-desc">Deskripsi</label>
          <textarea
            id="offer-desc"
            rows={3}
            className="input resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Lingkup pekerjaan yang disepakati dari diskusi…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="offer-price">Harga (Rp)</label>
            <input
              id="offer-price"
              type="number"
              min={0}
              className="input"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="mis. 2500000"
            />
          </div>
          <div>
            <label className="label" htmlFor="offer-deadline">Tenggat</label>
            <input
              id="offer-deadline"
              type="date"
              className="input"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Batal</button>
          <button
            onClick={handleSend}
            disabled={!valid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSignature className="w-4 h-4" /> Kirim Penawaran
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Offer card in the chat stream ───────────────────────────────────────────

const OFFER_BADGE: Record<OfferStatus, { label: string; variant: 'yellow' | 'green' | 'red' }> = {
  pending: { label: 'Menunggu respons', variant: 'yellow' },
  accepted: { label: 'Diterima', variant: 'green' },
  rejected: { label: 'Ditolak', variant: 'red' },
}

export function OfferMessageCard({
  offer,
  role,
  onRespond,
}: {
  offer: ProjectOffer
  role: UserRole
  onRespond?: (accepted: boolean) => void
}) {
  const badge = OFFER_BADGE[offer.status]
  return (
    <div className="rounded-xl border border-navy/15 bg-white p-4 w-full max-w-md shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-navy/70">
          <FileSignature className="w-3.5 h-3.5" /> Penawaran Proyek
        </span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <p className="text-sm font-semibold text-navy">{offer.title}</p>
      <p className="text-xs text-navy/60 mt-1 leading-relaxed">{offer.description}</p>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-lg bg-navy-50/50 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-navy/45 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Harga
          </p>
          <p className="text-sm font-bold text-navy mt-0.5">{formatCurrency(offer.price)}</p>
        </div>
        <div className="rounded-lg bg-navy-50/50 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-navy/45 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Tenggat
          </p>
          <p className="text-sm font-bold text-navy mt-0.5">{formatDate(offer.deadline)}</p>
        </div>
      </div>

      {role === 'client' && offer.status === 'pending' && onRespond && (
        <div className="flex gap-2 mt-3 border-t border-border pt-3">
          <button onClick={() => onRespond(true)} className="btn-primary text-xs py-2 px-3 flex-1 justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" /> Terima
          </button>
          <button onClick={() => onRespond(false)} className="btn-secondary text-xs py-2 px-3 flex-1 justify-center">
            Tolak
          </button>
        </div>
      )}
      {role === 'editor' && offer.status === 'pending' && (
        <p className="text-xs text-navy/45 mt-3">Menunggu respons klien.</p>
      )}
      {offer.status === 'rejected' && (
        <p className="text-xs text-amber-700 mt-3">
          Penawaran ditolak — lanjutkan diskusi untuk menyesuaikan, lalu kirim penawaran baru.
        </p>
      )}
      {offer.status === 'accepted' && (
        <p className="text-xs text-emerald-700 mt-3">Penawaran diterima — proyek dimulai.</p>
      )}
    </div>
  )
}

// ─── AI summary card ─────────────────────────────────────────────────────────

export function AiAnalysisCard({ analysis }: { analysis: RevisionAnalysis }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-navy-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-navy/70">
          <Bot className="w-3.5 h-3.5" /> Analisis Revisi AI
        </span>
        <StatusBadge status={analysis.type} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/45 mb-1">Ringkasan</p>
        <p className="text-sm text-navy/80 leading-relaxed">{analysis.summary}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/45 mb-1">Alasan</p>
        <p className="text-sm text-navy/80 leading-relaxed">{analysis.reason}</p>
      </div>
    </div>
  )
}

// ─── Client review actions ───────────────────────────────────────────────────

type ReviewPhase = 'idle' | 'writing' | 'analyzing' | 'analyzed'

export function ClientReviewPanel({
  onApprove,
  onConfirmRevision,
  onDiscuss,
  onDispute,
}: {
  onApprove: () => void
  onConfirmRevision: (feedback: string, analysis: RevisionAnalysis) => void
  onDiscuss?: () => void
  onDispute?: () => void
}) {
  const [phase, setPhase] = useState<ReviewPhase>('idle')
  const [feedback, setFeedback] = useState('')
  const [analysis, setAnalysis] = useState<RevisionAnalysis | null>(null)

  function submitFeedback() {
    setPhase('analyzing')
    // Simulated latency so the AI step reads as an actual analysis.
    window.setTimeout(() => {
      setAnalysis(analyzeFeedback(feedback))
      setPhase('analyzed')
    }, 900)
  }

  if (phase === 'idle') {
    return (
      <div className="flex gap-2 flex-wrap">
        <button onClick={onApprove} className="btn-primary text-xs py-2 px-3">
          <CheckCircle2 className="w-3.5 h-3.5" /> Setujui Proyek
        </button>
        <button onClick={() => setPhase('writing')} className="btn-secondary text-xs py-2 px-3">
          <RotateCcw className="w-3.5 h-3.5" /> Minta Revisi
        </button>
      </div>
    )
  }

  if (phase === 'writing') {
    return (
      <div className="space-y-2">
        <label className="label" htmlFor="revision-feedback">Umpan balik revisi</label>
        <textarea
          id="revision-feedback"
          rows={3}
          className="input resize-none"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder='mis. "Tolong cerahkan gambarnya dan crop sisi kiri."'
        />
        <div className="flex gap-2">
          <button
            onClick={submitFeedback}
            disabled={!feedback.trim()}
            className="btn-primary text-xs py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kirim Umpan Balik
          </button>
          <button onClick={() => setPhase('idle')} className="btn-ghost text-xs py-2 px-3">Batal</button>
        </div>
      </div>
    )
  }

  if (phase === 'analyzing') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-navy-50/40 p-3 text-sm text-navy/60">
        <Bot className="w-4 h-4 animate-pulse" /> AI sedang menganalisis umpan balik…
      </div>
    )
  }

  if (!analysis) return null
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white p-3">
        <p className="text-[11px] uppercase tracking-wider text-navy/45 mb-1">Umpan balik Anda</p>
        <p className="text-sm text-navy/80 leading-relaxed">{feedback}</p>
      </div>

      <AiAnalysisCard analysis={analysis} />

      {analysis.type === 'minor' ? (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onConfirmRevision(feedback.trim(), analysis)}
            className="btn-primary text-xs py-2 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kirim Permintaan Revisi
          </button>
          <button onClick={() => setPhase('writing')} className="btn-ghost text-xs py-2 px-3">
            Ubah umpan balik
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <p className="text-sm text-navy/80 leading-relaxed">
            Permintaan ini diklasifikasikan sebagai <span className="font-semibold">revisi major</span>.
            Silakan diskusikan lingkup dengan editor sebelum melanjutkan.
          </p>
          <p className="text-xs text-navy/55">Proyek tidak dibuka ulang secara otomatis untuk revisi major.</p>
          <div className="flex gap-2 flex-wrap">
            {onDiscuss && (
              <button onClick={onDiscuss} className="btn-primary text-xs py-2 px-3">
                <MessageSquare className="w-3.5 h-3.5" /> Lanjutkan Diskusi
              </button>
            )}
            {onDispute && (
              <button onClick={onDispute} className="btn-secondary text-xs py-2 px-3">
                <ShieldAlert className="w-3.5 h-3.5" /> Ajukan Sengketa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dispute placeholder ─────────────────────────────────────────────────────

const MEDIATOR_ITEMS = [
  { icon: FileSignature, label: 'Penawaran Proyek' },
  { icon: MessageSquare, label: 'Riwayat Chat' },
  { icon: Upload, label: 'Hasil Kerja Terkirim' },
  { icon: Bot, label: 'Ringkasan Revisi AI' },
]

export function MediatorReviewNotice() {
  return (
    <div className="rounded-xl border border-navy/10 bg-navy-50/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-4 h-4 text-navy/60" />
        <p className="text-sm font-semibold text-navy">Menunggu tinjauan mediator</p>
      </div>
      <p className="text-xs text-navy/60 leading-relaxed mb-3">
        Mediator akan meninjau materi berikut untuk mengambil keputusan:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MEDIATOR_ITEMS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy/70"
          >
            <Icon className="w-3.5 h-3.5 text-navy/50 shrink-0" /> {label}
          </span>
        ))}
      </div>
    </div>
  )
}
