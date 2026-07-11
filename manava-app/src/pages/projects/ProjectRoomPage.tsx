// Ruang Proyek — tata letak messenger tiga kolom:
//   kiri   → daftar proyek sebagai daftar percakapan (pindah ruang tanpa keluar)
//   tengah → chat diskusi dengan input pill + menu aksi "+" (brief/preview)
//   kanan  → info lawan chat & dokumen proyek (brief, preview, unduhan, ulasan)
// Role staff (manajer/HR/superadmin) melihat ruang sebagai read-only.

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, CheckCircle2, FileText, PackageCheck, Plus,
  RefreshCw, Send, X,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useMe } from '../../hooks/queries/useMe'
import { useProjects } from '../../hooks/queries/useProjects'
import {
  useProjectDetail, useProjectDownloads, useProjectMessages,
  useProjectRoomMutations,
} from '../../hooks/queries/useProjectRoom'
import { ChatThread } from './room/ChatThread'
import { ConversationList } from './room/ConversationList'
import { ProjectInfoPane } from './room/ProjectInfoPane'
import { BriefFormModal, DeliverableModal } from './room/EditorModals'
import { RevisionModal } from './room/RevisionModal'
import { ReviewPanel } from './room/ReviewPanel'
import type { UserRole } from '../../types'

export default function ProjectRoomPage({ role }: { role: UserRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const meQuery = useMe()
  const detailQuery = useProjectDetail(id)
  const messagesQuery = useProjectMessages(id)
  const projectsQuery = useProjects()
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

  const deliverables = useMemo(
    () => (messagesQuery.data ?? []).filter(m => m.message_type === 'deliverable').reverse(),
    [messagesQuery.data],
  )

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
  const canSendPreview = access === 'editor' && (p.status === 'in_progress' || p.status === 'revision')
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
    <div className="max-w-[1400px] space-y-4">
      <BackLink onClick={() => navigate('/projects')} />

      <div className="card no-hover p-0 overflow-hidden">
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:h-[calc(100vh-190px)] lg:min-h-[560px]">
          {/* ── Kolom kiri: daftar percakapan ── */}
          <aside className="hidden lg:block border-r border-border min-h-0">
            <ConversationList
              projects={projectsQuery.data ?? []}
              activeId={p.project_id}
              role={role}
              onSelect={pid => navigate(`/projects/${pid}`)}
            />
          </aside>

          {/* ── Kolom tengah: chat ── */}
          <section className="flex flex-col min-w-0 min-h-0">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border bg-white">
              <span
                aria-hidden
                className="w-10 h-10 shrink-0 rounded-full bg-navy/10 border border-navy/15 flex items-center justify-center text-xs font-semibold text-navy"
              >
                {avatarInitials(counterpart.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy truncate">{counterpart.name}</p>
                <p className="text-[11px] text-navy/45 truncate">{p.title}</p>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/35 shrink-0 hidden sm:block">
                Percakapan proyek
              </p>
            </div>

            {messagesQuery.isLoading ? (
              <p className="text-sm text-navy/50 py-16 text-center bg-[#f4f5f7] lg:flex-1">Memuat percakapan…</p>
            ) : (
              <ChatThread
                messages={messagesQuery.data ?? []}
                myUserId={meQuery.data?.user_id}
                heightClass="h-[420px] lg:h-auto lg:flex-1 lg:min-h-0"
              />
            )}

            {/* Bar tindakan klien saat preview menunggu tanggapan */}
            {access === 'client' && p.status === 'in_review' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-4 py-3 border-t border-emerald-200 bg-emerald-50/50">
                <p className="text-xs text-navy/75 flex-1">
                  <strong className="text-navy">Preview terbaru menunggu tanggapan Anda.</strong>
                </p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setCompleteOpen(true)} className="btn-primary text-xs px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selesai & Setuju
                  </button>
                  <button onClick={() => setRevisionOpen(true)} className="btn-secondary text-xs px-3 py-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Minta Revisi
                  </button>
                </div>
              </div>
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

                {(canSendBrief || canSendPreview) && (
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
                          {canSendBrief && (
                            <ActionMenuItem
                              icon={<FileText className="w-4 h-4 text-navy" />}
                              title={pendingBrief ? 'Kirim Brief Baru' : 'Kirim Brief'}
                              description={pendingBrief
                                ? 'Brief sebelumnya menunggu jawaban klien — brief baru akan menggantikannya.'
                                : 'Penawaran berisi lingkup kerja, batas revisi, dan harga.'}
                              onClick={() => { setActionMenuOpen(false); setBriefOpen(true) }}
                            />
                          )}
                          {canSendPreview && (
                            <ActionMenuItem
                              icon={<PackageCheck className="w-4 h-4 text-navy" />}
                              title="Kirim Preview"
                              description={p.status === 'revision'
                                ? 'Kirim hasil perbaikan atas permintaan revisi klien.'
                                : 'Kirim preview hasil kerja untuk ditinjau klien.'}
                              onClick={() => { setActionMenuOpen(false); setDeliverableOpen(true) }}
                            />
                          )}
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
          </section>

          {/* ── Kolom kanan: info lawan chat & dokumen proyek ── */}
          <aside className="border-t lg:border-t-0 lg:border-l border-border min-h-0 bg-[#fbfbfb]">
            <ProjectInfoPane
              project={p}
              access={access}
              counterpart={counterpart}
              deliverables={deliverables}
              downloads={downloadsQuery.data}
              downloadsLoading={downloadsQuery.isLoading && isCompleted && isClientViewer}
              onDownload={downloadFile}
              respondBrief={mutations.respondBrief}
              reviewSlot={p.status === 'completed' ? (
                <ReviewPanel
                  editorName={p.editor_name}
                  existing={existingReview}
                  canReview={access === 'client'}
                  mutation={mutations.submitReview}
                />
              ) : null}
            />
          </aside>
        </div>
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

function ActionMenuItem({ icon, title, description, onClick }: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-navy/5 transition-colors"
    >
      <span className="w-8 h-8 shrink-0 rounded-full bg-navy/10 flex items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{title}</span>
        <span className="block text-[11px] text-navy/50 leading-snug mt-0.5">{description}</span>
      </span>
    </button>
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
