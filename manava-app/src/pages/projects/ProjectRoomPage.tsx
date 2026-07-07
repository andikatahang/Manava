// Ruang Proyek — pusat alur booking untuk klien & editor di satu halaman:
// chat diskusi, brief penawaran (kirim/setujui/tolak), preview hasil kerja,
// permintaan revisi bergerbang analisis AI, penyelesaian proyek, dan ulasan
// KPI. Role staff (manajer/HR/superadmin) melihat ruang sebagai read-only.

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Building2, CheckCircle2, FileText,
  PackageCheck, RefreshCw, Send, User, X,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useMe } from '../../hooks/queries/useMe'
import {
  useProjectDetail, useProjectMessages, useProjectRoomMutations,
} from '../../hooks/queries/useProjectRoom'
import { ChatThread } from './room/ChatThread'
import { BriefFormModal, DeliverableModal } from './room/EditorModals'
import { RevisionModal } from './room/RevisionModal'
import { ReviewPanel } from './room/ReviewPanel'
import type { UserRole } from '../../types'

export default function ProjectRoomPage({ role: _role }: { role: UserRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const meQuery = useMe()
  const detailQuery = useProjectDetail(id)
  const messagesQuery = useProjectMessages(id)
  const mutations = useProjectRoomMutations(id)

  const [briefOpen, setBriefOpen] = useState(false)
  const [deliverableOpen, setDeliverableOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')

  if (detailQuery.isLoading) return <p className="text-sm text-navy/50">Memuat ruang proyek…</p>
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="max-w-3xl">
        <BackLink onClick={() => navigate('/projects')} />
        <div className="card mt-4 text-center py-16 text-navy/40">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Proyek tidak ditemukan atau Anda tidak memiliki akses.</p>
        </div>
      </div>
    )
  }

  const p = detailQuery.data
  const access = p.viewer_access
  const pendingBrief = p.contracts.find(c => c.status === 'pending_client_approval') ?? null
  const existingReview = p.reviews[0] ?? null
  const isParticipant = access === 'client' || access === 'editor'
  const chatEnabled = isParticipant && p.status !== 'cancelled'

  function sendChat() {
    const body = chatInput.trim()
    if (!body || mutations.sendMessage.isPending) return
    mutations.sendMessage.mutate(body, { onSuccess: () => setChatInput('') })
  }

  return (
    <div className="max-w-4xl space-y-5">
      <BackLink onClick={() => navigate('/projects')} />

      {/* Header proyek */}
      <div className="card no-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-navy/40">
              {p.status === 'draft' ? 'Ruang diskusi' : 'Ruang proyek'}
            </p>
            <h1 className="text-lg font-semibold text-navy leading-tight mt-1">{p.title}</h1>
            {p.description && (
              <p className="text-sm text-navy/60 mt-1.5 line-clamp-2">{p.description}</p>
            )}
          </div>
          <StatusBadge status={p.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-3.5 border-t border-border text-xs text-navy/60">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-navy/40" /> Editor: <strong className="text-navy">{p.editor_name}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-navy/40" /> Klien: <strong className="text-navy">{p.client_name}</strong>
          </span>
          {p.project_value > 0 && (
            <span>Nilai: <strong className="text-navy">{formatCurrency(p.project_value)}</strong></span>
          )}
          {p.envelope && p.status !== 'draft' && (
            <span className="bg-navy/5 rounded-full px-2.5 py-1 font-semibold text-navy/70">
              Revisi minor: {p.envelope.allowance_consumed}/{p.envelope.allowance_count} terpakai
            </span>
          )}
          <span className="text-navy/40">Dibuat {formatDate(p.created_at)}</span>
        </div>
      </div>

      {/* Panel keputusan brief (klien) */}
      {access === 'client' && pendingBrief && (
        <div className="card no-hover border-navy/25">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy/60 mb-2">
            <FileText className="w-3.5 h-3.5" /> Brief menunggu persetujuan Anda
          </p>
          <h3 className="text-sm font-semibold text-navy">{pendingBrief.title ?? p.title}</h3>
          <p className="text-xs text-navy/65 mt-1.5 leading-relaxed whitespace-pre-wrap">{pendingBrief.scope}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            <span className="text-navy/60">Batas revisi minor: <strong className="text-navy">{pendingBrief.revision_limit}x gratis</strong></span>
            <span className="text-navy/60">Harga: <strong className="text-navy">{formatCurrency(pendingBrief.project_value)}</strong></span>
          </div>
          {mutations.respondBrief.isError && (
            <p className="text-xs text-red-600 mt-2">{mutations.respondBrief.error.message}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => mutations.respondBrief.mutate(true)}
              disabled={mutations.respondBrief.isPending}
              className="btn-primary text-sm disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" /> Setujui & Mulai Proyek
            </button>
            <button
              onClick={() => mutations.respondBrief.mutate(false)}
              disabled={mutations.respondBrief.isPending}
              className="btn-secondary text-sm disabled:opacity-60"
            >
              <X className="w-4 h-4" /> Tolak — diskusi ulang
            </button>
          </div>
        </div>
      )}

      {/* Banner tindakan klien saat preview masuk */}
      {access === 'client' && p.status === 'in_review' && (
        <div className="card no-hover border-emerald-200 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-navy/75 flex-1">
            <strong className="text-navy">Preview terbaru menunggu tanggapan Anda.</strong>{' '}
            Setujui hasil untuk menyelesaikan proyek, atau minta revisi.
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setCompleteOpen(true)} className="btn-primary text-sm">
              <CheckCircle2 className="w-4 h-4" /> Selesai & Setuju
            </button>
            <button onClick={() => setRevisionOpen(true)} className="btn-secondary text-sm">
              <RefreshCw className="w-4 h-4" /> Minta Revisi
            </button>
          </div>
        </div>
      )}

      {/* Banner aksi editor */}
      {access === 'editor' && (p.status === 'draft' || p.status === 'awaiting_dp') && (
        <div className="card no-hover border-navy/20 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-navy/75 flex-1">
            {pendingBrief
              ? <>Brief sudah terkirim — <strong className="text-navy">menunggu jawaban klien</strong>. Anda dapat mengirim brief baru untuk menggantikannya.</>
              : <>Sudah sepakat dengan klien? <strong className="text-navy">Kirim brief penawaran</strong> berisi judul, deskripsi, batas revisi, dan harga.</>}
          </p>
          <button onClick={() => setBriefOpen(true)} className="btn-primary text-sm shrink-0">
            <FileText className="w-4 h-4" /> {pendingBrief ? 'Kirim Brief Baru' : 'Kirim Brief'}
          </button>
        </div>
      )}
      {access === 'editor' && (p.status === 'in_progress' || p.status === 'revision') && (
        <div className="card no-hover border-navy/20 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-navy/75 flex-1">
            {p.status === 'revision'
              ? <><strong className="text-navy">Klien meminta revisi</strong> — lihat detailnya di chat, lalu kirim preview hasil perbaikan.</>
              : <>Proyek sedang berjalan. Kirim <strong className="text-navy">preview hasil kerja</strong> saat siap ditinjau klien.</>}
          </p>
          <button onClick={() => setDeliverableOpen(true)} className="btn-primary text-sm shrink-0">
            <PackageCheck className="w-4 h-4" /> Kirim Preview
          </button>
        </div>
      )}

      {/* Ulasan (selesai) */}
      {p.status === 'completed' && (
        <ReviewPanel
          editorName={p.editor_name}
          existing={existingReview}
          canReview={access === 'client'}
          mutation={mutations.submitReview}
        />
      )}

      {/* Chat */}
      <div className="card no-hover">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-3">
          Percakapan proyek
        </p>
        {messagesQuery.isLoading ? (
          <p className="text-sm text-navy/50 py-10 text-center">Memuat percakapan…</p>
        ) : (
          <ChatThread messages={messagesQuery.data ?? []} myUserId={meQuery.data?.user_id} />
        )}

        {chatEnabled && (
          <form
            className="flex gap-2 mt-3 pt-3 border-t border-border"
            onSubmit={e => { e.preventDefault(); sendChat() }}
          >
            <input
              className="input flex-1"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={access === 'client' ? 'Tulis pesan untuk editor…' : 'Tulis pesan untuk klien…'}
              maxLength={2000}
              aria-label="Pesan baru"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || mutations.sendMessage.isPending}
              className="btn-primary px-4 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        {access === 'staff' && (
          <p className="text-[11px] text-navy/40 mt-3 pt-3 border-t border-border">
            Anda melihat ruang ini sebagai pemantau — hanya klien dan editor yang dapat mengirim pesan.
          </p>
        )}
      </div>

      {/* Modals */}
      <BriefFormModal open={briefOpen} onClose={() => setBriefOpen(false)} mutation={mutations.sendBrief} />
      <DeliverableModal open={deliverableOpen} onClose={() => setDeliverableOpen(false)} mutation={mutations.sendDeliverable} />
      <RevisionModal
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        envelope={p.envelope}
        classify={mutations.classifyRevision}
        submit={mutations.submitRevision}
      />

      {/* Konfirmasi selesai */}
      <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Selesaikan Proyek?" size="sm">
        <p className="text-sm text-navy/70 leading-relaxed">
          Dengan menekan <strong>Selesai & Setuju</strong>, Anda menyatakan menerima hasil akhir dari{' '}
          {p.editor_name}. Proyek ditandai selesai dan Anda dapat memberi ulasan kinerja editor.
        </p>
        {mutations.completeProject.isError && (
          <p className="text-xs text-red-600 mt-2">{mutations.completeProject.error.message}</p>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setCompleteOpen(false)} className="btn-secondary text-sm">Batal</button>
          <button
            onClick={() => mutations.completeProject.mutate(undefined, { onSuccess: () => setCompleteOpen(false) })}
            disabled={mutations.completeProject.isPending}
            className="btn-primary text-sm disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            {mutations.completeProject.isPending ? 'Menyimpan…' : 'Selesai & Setuju'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/60 hover:text-navy transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Kembali ke daftar proyek
    </button>
  )
}
