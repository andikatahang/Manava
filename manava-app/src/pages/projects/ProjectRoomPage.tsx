// Ruang Proyek — pusat alur booking untuk klien & editor di satu halaman:
// chat diskusi, brief penawaran (kirim/setujui/tolak), preview hasil kerja,
// permintaan revisi bergerbang analisis AI, penyelesaian proyek, dan ulasan
// KPI. Role staff (manajer/HR/superadmin) melihat ruang sebagai read-only.

import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Building2, CheckCircle2, Download, FileText,
  PackageCheck, Plus, RefreshCw, Send, User, X,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useMe } from '../../hooks/queries/useMe'
import {
  useProjectDetail, useProjectDownloads, useProjectMessages,
  useProjectRoomMutations,
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const isCompleted = detailQuery.data?.status === 'completed'
  const isClientViewer = detailQuery.data?.viewer_access === 'client'
  const downloadsQuery = useProjectDownloads(id, isCompleted && isClientViewer)

  const downloadFile = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

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
  const canSendBrief = access === 'editor' && (p.status === 'draft' || p.status === 'awaiting_dp')
  const counterpart = access === 'client'
    ? { name: p.editor_name, role: 'Staf Editor' }
    : access === 'editor'
      ? { name: p.client_name, role: 'Klien' }
      : { name: `${p.client_name} · ${p.editor_name}`, role: 'Klien & Staf' }

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
            <User className="w-3.5 h-3.5 text-navy/40" /> Staf: <strong className="text-navy">{p.editor_name}</strong>
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

      {/* Ulasan & download (selesai) */}
      {p.status === 'completed' && (
        <>
          {/* Panel download — hanya untuk klien */}
          {access === 'client' && (
            <div className="card no-hover border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-3">
                <Download className="w-3.5 h-3.5" /> Unduh Hasil Akhir
              </p>
              <p className="text-xs text-navy/60 mb-4">
                Proyek telah selesai — Anda dapat mengunduh file hasil editing <strong className="text-navy">tanpa watermark</strong> di bawah ini.
              </p>
              {downloadsQuery.isLoading && (
                <p className="text-xs text-navy/50 py-4 text-center">Memuat file…</p>
              )}
              {downloadsQuery.data && downloadsQuery.data.length === 0 && (
                <p className="text-xs text-navy/45 py-4 text-center">
                  Tidak ada file gambar untuk diunduh. Staf mengirim preview melalui tautan eksternal.
                </p>
              )}
              {downloadsQuery.data && downloadsQuery.data.length > 0 && (
                <div className="space-y-2.5">
                  {downloadsQuery.data.map(file => {
                    const isImage = file.download_url.startsWith('data:image/')
                    const ext = file.download_url.match(/^data:image\/(\w+)/)?.[1] ?? 'png'
                    const safeName = `${p.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'manava'}-${file.file_label.replace(/\s+/g, '-')}.${ext}`
                    return (
                      <div
                        key={file.message_id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-emerald-100 bg-white/80 hover:bg-emerald-50/50 transition-colors"
                      >
                        {/* Thumbnail preview (watermarked) */}
                        {file.preview_url && file.preview_url.startsWith('data:image/') && (
                          <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-navy/5 border border-border">
                            <img
                              src={file.preview_url}
                              alt={file.file_label}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy truncate">{file.file_label}</p>
                          <p className="text-[11px] text-navy/50 truncate mt-0.5">{file.note}</p>
                          <p className="text-[10px] text-navy/35 mt-0.5">{formatDate(file.created_at)}</p>
                        </div>
                        {isImage ? (
                          <button
                            onClick={() => downloadFile(file.download_url, safeName)}
                            className="btn-primary text-xs px-3 py-1.5 shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh
                          </button>
                        ) : (
                          <a
                            href={file.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs px-3 py-1.5 shrink-0 inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Buka
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <ReviewPanel
            editorName={p.editor_name}
            existing={existingReview}
            canReview={access === 'client'}
            mutation={mutations.submitReview}
          />
        </>
      )}

      {/* Chat — gaya messenger: header lawan bicara, kanvas pesan, input pill */}
      <div className="card no-hover p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border bg-white">
          <span
            aria-hidden
            className="w-10 h-10 shrink-0 rounded-full bg-navy/10 border border-navy/15 flex items-center justify-center text-xs font-semibold text-navy"
          >
            {avatarInitials(counterpart.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy truncate">{counterpart.name}</p>
            <p className="text-[11px] text-navy/45">{counterpart.role}</p>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/35 shrink-0">
            Percakapan proyek
          </p>
        </div>

        {messagesQuery.isLoading ? (
          <p className="text-sm text-navy/50 py-16 text-center bg-[#f4f5f7]">Memuat percakapan…</p>
        ) : (
          <ChatThread messages={messagesQuery.data ?? []} myUserId={meQuery.data?.user_id} />
        )}

        {chatEnabled && (
          <form
            className="flex items-center gap-2 px-3 sm:px-4 py-3 border-t border-border bg-white"
            onSubmit={e => { e.preventDefault(); sendChat() }}
          >
            <input
              className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-border bg-[#f4f5f7] text-sm
                         focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 focus:bg-white
                         placeholder:text-gray-400 transition-all duration-150"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={access === 'client' ? 'Tulis pesan untuk staf…' : 'Tulis pesan untuk klien…'}
              maxLength={2000}
              aria-label="Pesan baru"
            />

            {canSendBrief && (
              <div className="relative shrink-0">
                {actionMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Tutup menu aksi"
                      onClick={() => setActionMenuOpen(false)}
                    />
                    <div className="absolute bottom-12 right-0 z-20 w-64 rounded-2xl border border-border bg-white shadow-xl p-1.5">
                      <button
                        type="button"
                        onClick={() => { setActionMenuOpen(false); setBriefOpen(true) }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-navy/5 transition-colors"
                      >
                        <span className="w-8 h-8 shrink-0 rounded-full bg-navy/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-navy" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-navy">
                            {pendingBrief ? 'Kirim Brief Baru' : 'Kirim Brief'}
                          </span>
                          <span className="block text-[11px] text-navy/50 leading-snug mt-0.5">
                            {pendingBrief
                              ? 'Brief sebelumnya menunggu jawaban klien — brief baru akan menggantikannya.'
                              : 'Penawaran berisi lingkup kerja, batas revisi, dan harga.'}
                          </span>
                        </span>
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setActionMenuOpen(v => !v)}
                  aria-label="Aksi lainnya"
                  aria-expanded={actionMenuOpen}
                  aria-haspopup="menu"
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-150 ${
                    actionMenuOpen
                      ? 'bg-navy text-white border-navy rotate-45'
                      : 'bg-white text-navy/60 border-border hover:text-navy hover:border-navy/30'
                  }`}
                >
                  <Plus className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!chatInput.trim() || mutations.sendMessage.isPending}
              className="w-10 h-10 shrink-0 rounded-full bg-navy text-white flex items-center justify-center
                         hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        {access === 'staff' && (
          <p className="text-[11px] text-navy/40 px-4 sm:px-5 py-3 border-t border-border bg-white">
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

function avatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
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
