import { useState, useRef } from 'react'
import {
  CheckCircle2, AlertCircle, Layers, FileText, ShieldCheck, Bot,
  FileImage, Film, Send, ArrowRight, ShieldAlert, Clock, Inbox, Upload,
  Plus, Pencil, Eye, Download, Lock, FileSignature,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate, formatDateTime, getInitials } from '../../lib/utils'
import {
  mockMessages, mockEscrowAccounts, mockTransactions, mockDisputes,
} from '../../data/mockData'
import { EnvelopeBuilder } from './EnvelopeBuilder'
import { DisputeForm } from './DisputeForm'
import {
  OfferComposer, OfferMessageCard, ClientReviewPanel, MediatorReviewNotice,
} from './workflow'
import type { ProjectOffer, RevisionAnalysis } from './workflow'
import type { Project, Message, UserRole, RevisionEnvelope, Dispute } from '../../types'

// ─── Shared bits ──────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-navy/45 uppercase tracking-wider mb-3">{children}</p>
}

function AllowanceBar({ consumed, total }: { consumed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min((consumed / total) * 100, 100)
  const color = pct >= 100 ? 'bg-red-500' : pct >= 66 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-navy/50 mb-1">
        <span>{consumed} terpakai</span>
        <span>{total - consumed} tersisa</span>
      </div>
      <div className="h-1.5 bg-navy/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className="text-center py-12 text-navy/35">
      <Icon className="w-9 h-9 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

// ─── Ringkasan ──────────────────────────────────────────────────────────────

export function OverviewPanel({ project, envelope }: { project: Project; envelope?: RevisionEnvelope }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Brief</SectionLabel>
        <p className="text-sm text-navy/75 leading-relaxed">{project.description}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Fact label="Editor" value={project.editor_name} />
        <Fact label="Nilai proyek" value={formatCurrency(project.project_value)} />
        <Fact label="Mulai" value={project.started_at ? formatDate(project.started_at) : '—'} />
        <Fact label="Dibuat" value={formatDate(project.created_at)} />
      </div>

      {envelope && (
        <div>
          <SectionLabel>Envelope revisi</SectionLabel>
          <div className="space-y-3">
            <ScopeRow tone="ok" title="Cakupan termasuk" body={envelope.included_scope} />
            <ScopeRow tone="no" title="Cakupan tidak termasuk" body={envelope.excluded_scope} />
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-navy/50" />
                <span className="text-xs font-semibold text-navy/70">
                  Jatah revisi gratis — {envelope.allowance_consumed}/{envelope.allowance_count} terpakai
                </span>
              </div>
              <AllowanceBar consumed={envelope.allowance_consumed} total={envelope.allowance_count} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-50/40 p-3">
      <p className="text-[11px] text-navy/45 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-navy mt-1 truncate" title={value}>{value}</p>
    </div>
  )
}

function ScopeRow({ tone, title, body }: { tone: 'ok' | 'no'; title: string; body: string }) {
  const ok = tone === 'ok'
  return (
    <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {ok
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
        <span className={`text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-red-600'}`}>{title}</span>
      </div>
      <p className="text-xs text-navy/70 leading-relaxed">{body}</p>
    </div>
  )
}

// ─── Kontrak ──────────────────────────────────────────────────────────────────

export function ContractPanel({
  project,
  role = 'client',
  envelope,
  agreedAt,
  onEnvelopeChange,
  onAgree,
}: {
  project: Project
  role?: UserRole
  envelope?: RevisionEnvelope
  agreedAt: string | null
  onEnvelopeChange: (envelope: RevisionEnvelope) => void
  onAgree: () => void
}) {
  const isEditor = role === 'editor'
  const [builderOpen, setBuilderOpen] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)

  const contractStatus = project.status === 'completed' ? 'closed'
    : project.status === 'cancelled' ? 'rejected' : 'active'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-navy/5 text-navy">
            <FileText className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Brief & Kontrak Layanan</p>
            <p className="text-xs text-navy/50">Diterbitkan {formatDate(project.created_at)}</p>
          </div>
        </div>
        <StatusBadge status={contractStatus} />
      </div>

      <div>
        <SectionLabel>Lingkup pekerjaan</SectionLabel>
        <p className="text-sm text-navy/75 leading-relaxed">{project.description}</p>
      </div>

      {/* Revision Envelope — the digital work agreement */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-navy/45 uppercase tracking-wider">Revision Envelope</p>
          {envelope && !agreedAt && isEditor && (
            <button onClick={() => setBuilderOpen(true)} className="btn-ghost text-xs py-1.5 px-3">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {!envelope ? (
          isEditor ? (
            <div className="rounded-xl border border-dashed border-navy/20 bg-navy-50/30 p-6 text-center">
              <FileText className="w-8 h-8 mx-auto text-navy/30 mb-2" />
              <p className="text-sm text-navy/60 mb-4">
                Belum ada Revision Envelope. Susun kesepakatan kerja digital sebelum proyek mulai.
              </p>
              <button onClick={() => setBuilderOpen(true)} className="btn-primary text-sm mx-auto">
                <Plus className="w-4 h-4" /> Susun Revision Envelope
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-navy-50/30 p-4 text-sm text-navy/55">
              Editor belum menyusun Revision Envelope untuk proyek ini.
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <ScopeRow tone="ok" title="Termasuk" body={envelope.included_scope} />
              <ScopeRow tone="no" title="Tidak termasuk" body={envelope.excluded_scope} />
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-navy/50" />
                <span className="text-xs font-semibold text-navy/70">
                  Jatah revisi gratis — {envelope.allowance_consumed}/{envelope.allowance_count} terpakai
                </span>
              </div>
              <AllowanceBar consumed={envelope.allowance_consumed} total={envelope.allowance_count} />
            </div>

            {/* Agreement confirmation */}
            {agreedAt ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Kesepakatan dikonfirmasi</p>
                  <p className="text-xs text-navy/60 mt-0.5">
                    Disepakati pada {formatDateTime(agreedAt)}. Lingkup terkunci untuk kedua pihak.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={e => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-navy shrink-0"
                  />
                  <span className="text-sm text-navy/75">
                    Saya menyetujui lingkup dan jatah revisi di atas sebagai kesepakatan kerja digital yang mengikat.
                  </span>
                </label>
                <button
                  onClick={onAgree}
                  disabled={!confirmChecked}
                  className="btn-primary text-sm mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" /> Konfirmasi Kesepakatan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Fact label="Nilai kontrak" value={formatCurrency(project.project_value)} />
        <Fact label="DP" value={formatCurrency(project.dp_amount)} />
        <Fact label="Pelunasan" value={formatCurrency(project.final_amount)} />
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-navy/70 leading-relaxed">
          Pembayaran Anda ditahan aman di escrow dan baru dicairkan ke editor setelah Anda menyetujui hasil akhir.
        </p>
      </div>

      <EnvelopeBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        projectId={project.project_id}
        initial={envelope}
        onSave={env => { onEnvelopeChange(env); setConfirmChecked(false) }}
      />
    </div>
  )
}

// ─── Hasil Kerja ──────────────────────────────────────────────────────────────

export interface DeliverableVersion {
  version: number
  uploaded_at: string
  uploaded_by: string
  file_name: string
  file_size: string
  status: 'pending_review' | 'approved' | 'rejected' | 'revision_requested'
  ai_diff_score: number
  ai_change_type: 'minor' | 'major' | 'new'
  ai_confidence: number
  change_summary: string
}

export const DELIVERABLES: Record<string, DeliverableVersion[]> = {
  p1: [
    { version: 3, uploaded_at: '2026-06-24T10:30:00Z', uploaded_by: 'Budi Santoso', file_name: 'catalog_hero_v3.psd', file_size: '142 MB', status: 'pending_review', ai_diff_score: 12, ai_change_type: 'minor', ai_confidence: 94, change_summary: 'Suhu warna +200K, retouch noda minor pada produk #7' },
    { version: 2, uploaded_at: '2026-06-22T14:15:00Z', uploaded_by: 'Budi Santoso', file_name: 'catalog_hero_v2.psd', file_size: '139 MB', status: 'revision_requested', ai_diff_score: 67, ai_change_type: 'major', ai_confidence: 89, change_summary: 'Terdeteksi penggantian latar — di luar lingkup brief' },
    { version: 1, uploaded_at: '2026-06-18T09:00:00Z', uploaded_by: 'Budi Santoso', file_name: 'catalog_hero_v1.psd', file_size: '136 MB', status: 'approved', ai_diff_score: 0, ai_change_type: 'new', ai_confidence: 100, change_summary: 'Pengiriman awal' },
  ],
  p2: [
    { version: 2, uploaded_at: '2026-06-20T16:00:00Z', uploaded_by: 'Sari Dewi', file_name: 'campaign_v2.mp4', file_size: '512 MB', status: 'pending_review', ai_diff_score: 8, ai_change_type: 'minor', ai_confidence: 97, change_summary: 'Color grade disetel, sinkronisasi audio diperbaiki' },
    { version: 1, uploaded_at: '2026-06-16T11:30:00Z', uploaded_by: 'Sari Dewi', file_name: 'campaign_v1.mp4', file_size: '498 MB', status: 'revision_requested', ai_diff_score: 0, ai_change_type: 'new', ai_confidence: 100, change_summary: 'Pengiriman awal' },
  ],
  p3: [
    { version: 1, uploaded_at: '2026-06-09T12:00:00Z', uploaded_by: 'Maya Putri', file_name: 'wedding_grade_final.mov', file_size: '1.2 GB', status: 'approved', ai_diff_score: 0, ai_change_type: 'new', ai_confidence: 100, change_summary: 'Color grade sinematik final — disetujui klien' },
  ],
}

function fileIcon(name: string) {
  if (/\.(mp4|mov|avi)$/i.test(name)) return <Film className="w-5 h-5 text-purple-500" />
  return <FileImage className="w-5 h-5 text-blue-500" />
}

function diffColor(score: number) {
  if (score <= 15) return 'text-emerald-700 bg-emerald-50'
  if (score <= 40) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

export function DeliverablesPanel({
  project,
  role = 'client',
  versions,
  onUpload,
  onApprove,
  onRequestRevision,
  onDiscuss,
  onDispute,
}: {
  project: Project
  role?: UserRole
  versions: DeliverableVersion[]
  onUpload: (version: DeliverableVersion) => void
  onApprove?: (version: DeliverableVersion) => void
  onRequestRevision?: (version: DeliverableVersion, feedback: string, analysis: RevisionAnalysis) => void
  onDiscuss?: () => void
  onDispute?: () => void
}) {
  const isEditor = role === 'editor'
  const canDownload = project.status === 'completed'
  // Uploads only make sense while the editor is actively working; once the
  // work sits in review (or is done/disputed) the ball is in the client's court.
  const canUpload = isEditor && (project.status === 'in_progress' || project.status === 'revision')
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<DeliverableVersion | null>(null)

  // Upload simulation: read the picked file's name/size and run a stub of the
  // AI change-detection that classifies new versions.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isFirst = versions.length === 0
    onUpload({
      version: isFirst ? 1 : Math.max(...versions.map(v => v.version)) + 1,
      uploaded_at: new Date().toISOString(),
      uploaded_by: project.editor_name,
      file_name: file.name,
      file_size: formatFileSize(file.size),
      status: 'pending_review',
      ai_diff_score: isFirst ? 0 : 10,
      ai_change_type: isFirst ? 'new' : 'minor',
      ai_confidence: isFirst ? 100 : 92,
      change_summary: isFirst
        ? 'Pengiriman awal'
        : 'Versi baru diunggah — deteksi perubahan AI otomatis: perubahan minor.',
    })
    e.target.value = '' // allow re-selecting the same file
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

      {canUpload && versions.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs py-2 px-3">
            <Upload className="w-3.5 h-3.5" /> Unggah versi baru
          </button>
        </div>
      )}

      {versions.length === 0 ? (
        <div className="text-center py-12 text-navy/35">
          <Inbox className="w-9 h-9 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada hasil kerja yang dikirim</p>
          {canUpload && (
            <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs py-2 px-3 mt-4 mx-auto">
              <Upload className="w-3.5 h-3.5" /> Unggah versi pertama
            </button>
          )}
        </div>
      ) : (
        versions.map(v => (
          <div
            key={v.version}
            className="rounded-xl border border-border bg-white p-4 transition-all duration-200 hover:border-navy/15 hover:shadow-[0_14px_44px_-16px_rgba(2,21,38,0.18)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-navy-50/60 shrink-0">{fileIcon(v.file_name)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy flex items-center gap-2">
                    Versi {v.version}
                    <span className="text-xs font-normal text-navy/45 truncate">{v.file_name}</span>
                  </p>
                  <p className="text-xs text-navy/45 mt-0.5">{v.file_size} · {formatDateTime(v.uploaded_at)}</p>
                </div>
              </div>
              <StatusBadge status={v.status} />
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-navy-50/40 p-2.5">
              <Bot className="w-3.5 h-3.5 text-navy/50 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffColor(v.ai_diff_score)}`}>
                    Beda {v.ai_diff_score}%
                  </span>
                  <span className="text-xs text-navy/50">Keyakinan AI {v.ai_confidence}%</span>
                </div>
                <p className="text-xs text-navy/70 leading-snug">{v.change_summary}</p>
              </div>
            </div>

            {/* Preview (watermarked) + download (gated on completion) */}
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => setPreview(v)} className="btn-secondary text-xs py-2 px-3">
                <Eye className="w-3.5 h-3.5" /> Pratinjau
              </button>
              <button
                disabled={!canDownload}
                title={canDownload ? 'Unduh file asli' : 'Tersedia setelah proyek selesai'}
                className="btn-secondary text-xs py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canDownload ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {canDownload ? 'Unduh' : 'Terkunci'}
              </button>
            </div>

            {/* Review actions live on the newest version while it awaits the client */}
            {role === 'client' && project.status === 'in_review'
              && v.version === versions[0]?.version && v.status === 'pending_review' && onApprove && (
              <div className="mt-3 border-t border-border pt-3">
                <ClientReviewPanel
                  onApprove={() => onApprove(v)}
                  onConfirmRevision={(feedback, analysis) => onRequestRevision?.(v, feedback, analysis)}
                  onDiscuss={onDiscuss}
                  onDispute={onDispute}
                />
              </div>
            )}
          </div>
        ))
      )}

      {preview && (
        <Modal open onClose={() => setPreview(null)} title={`Pratinjau — ${preview.file_name}`} size="lg">
          <div className="space-y-3">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[#021526] to-[#0c2438] grid place-items-center">
              <div className="relative z-10 text-center text-white/80 px-4">
                <span className="grid place-items-center w-14 h-14 rounded-2xl bg-white/10 mx-auto mb-3">
                  {/\.(mp4|mov|avi)$/i.test(preview.file_name)
                    ? <Film className="w-7 h-7 text-white" />
                    : <FileImage className="w-7 h-7 text-white" />}
                </span>
                <p className="text-sm font-medium">{preview.file_name}</p>
                <p className="text-xs text-white/50 mt-1">{preview.file_size}</p>
              </div>
              {/* Auto watermark overlay */}
              <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <div className="absolute inset-[-25%] flex flex-wrap gap-x-10 gap-y-7 rotate-[-30deg] opacity-20">
                  {Array.from({ length: 80 }).map((_, i) => (
                    <span key={i} className="text-white text-[12px] font-bold tracking-[0.25em] whitespace-nowrap">
                      MANAVA · PRATINJAU
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-navy/70 leading-relaxed">
                Pratinjau diberi watermark otomatis. File asli tanpa watermark tersedia untuk diunduh
                setelah proyek selesai.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                disabled={!canDownload}
                title={canDownload ? 'Unduh file asli' : 'Tersedia setelah proyek selesai'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canDownload ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {canDownload ? 'Unduh file asli' : 'Unduhan terkunci'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Chat ───────────────────────────────────────────────────────────────────

const MESSAGE_TYPE_TAG: Record<string, string> = {
  brief: 'Brief', deliverable: 'Hasil kerja', revision_request: 'Permintaan revisi', ai_summary: 'Ringkasan AI',
}

export function ChatPanel({
  project,
  role = 'client',
  offer,
  onSendOffer,
  onOfferResponse,
}: {
  project: Project
  role?: UserRole
  offer?: ProjectOffer | null
  onSendOffer?: (offer: ProjectOffer) => void
  onOfferResponse?: (accepted: boolean) => void
}) {
  const initial = mockMessages
    .filter(m => m.project_id === project.project_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const [messages, setMessages] = useState<Message[]>(initial)
  const [draft, setDraft] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)

  const isEditor = role === 'editor'
  const me = isEditor
    ? { id: project.editor_id, name: project.editor_name }
    : { id: project.client_id, name: project.client_name }
  // The editor may send (or re-send after rejection) an offer while the
  // project is still in the discussion phase.
  const canOffer = isEditor && project.status === 'draft'
    && (!offer || offer.status === 'rejected') && !!onSendOffer

  function send() {
    const text = draft.trim()
    if (!text) return
    setMessages(prev => [...prev, {
      message_id: `local-${prev.length}`,
      project_id: project.project_id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: role,
      body: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    }])
    setDraft('')
  }

  return (
    <div className="flex flex-col h-[480px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !offer && (
          <EmptyState icon={Inbox} text="Belum ada percakapan" />
        )}
        {messages.map(m => {
          const mine = m.sender_role === role
          const isSystem = m.message_type === 'system' || m.message_type === 'ai_summary'
          if (isSystem) {
            return (
              <div key={m.message_id} className="flex justify-center">
                <span className="text-xs text-navy/55 bg-navy-50/60 rounded-full px-3 py-1.5 max-w-[85%] text-center">
                  {m.body}
                </span>
              </div>
            )
          }
          return (
            <div key={m.message_id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
              <span className="grid place-items-center w-7 h-7 rounded-full bg-navy/10 text-navy text-[10px] font-semibold shrink-0">
                {getInitials(m.sender_name)}
              </span>
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-3.5 py-2 text-sm leading-snug ${mine ? 'bg-navy text-white rounded-tr-sm' : 'bg-navy-50/70 text-navy rounded-tl-sm'}`}>
                  {MESSAGE_TYPE_TAG[m.message_type] && (
                    <span className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${mine ? 'text-white/60' : 'text-navy/45'}`}>
                      {MESSAGE_TYPE_TAG[m.message_type]}
                    </span>
                  )}
                  {m.body}
                </div>
                <span className="text-[10px] text-navy/35 mt-1 px-1">{m.sender_name} · {formatDateTime(m.created_at)}</span>
              </div>
            </div>
          )
        })}

        {/* Offer travels through the chat as a rich card */}
        {offer && (
          <div className={`flex ${isEditor ? 'justify-end' : 'justify-start'}`}>
            <OfferMessageCard offer={offer} role={role} onRespond={onOfferResponse} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {canOffer && (
          <button
            onClick={() => setComposerOpen(true)}
            className="btn-secondary px-3 py-2.5 shrink-0"
            title="Kirim penawaran proyek"
            aria-label="Kirim penawaran proyek"
          >
            <FileSignature className="w-4 h-4" />
          </button>
        )}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          className="input"
          placeholder={isEditor ? 'Tulis pesan ke klien…' : 'Tulis pesan ke editor…'}
        />
        <button onClick={send} className="btn-primary px-3 py-2.5 shrink-0" aria-label="Kirim pesan">
          <Send className="w-4 h-4" />
        </button>
      </div>

      {onSendOffer && (
        <OfferComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          defaultTitle={project.title}
          onSend={onSendOffer}
        />
      )}
    </div>
  )
}

// ─── Pembayaran ────────────────────────────────────────────────────────────────

const TXN_LABELS: Record<string, string> = {
  dp_payment: 'Pembayaran DP', final_payment: 'Pelunasan', major_topup: 'Top-up revisi',
  escrow_hold: 'Tahan escrow', escrow_release: 'Pencairan escrow', refund: 'Pengembalian', payroll: 'Penggajian',
}

export function PaymentPanel({ project }: { project: Project }) {
  const escrow = mockEscrowAccounts.find(e => e.project_id === project.project_id)
  const transactions = mockTransactions
    .filter(t => t.project_id === project.project_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-6">
      {escrow && (
        <div>
          <SectionLabel>Saldo escrow</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <Balance label="Ditahan" value={escrow.held_balance} tone="navy" />
            <Balance label="Dicairkan" value={escrow.released_balance} tone="emerald" />
            <Balance label="Dikembalikan" value={escrow.refunded_balance} tone="amber" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Fact label="DP (50%)" value={formatCurrency(project.dp_amount)} />
        <Fact label="Pelunasan (50%)" value={formatCurrency(project.final_amount)} />
      </div>

      <div>
        <SectionLabel>Riwayat transaksi</SectionLabel>
        {transactions.length === 0 ? (
          <EmptyState icon={Clock} text="Belum ada transaksi" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {transactions.map((t, i) => (
              <div key={t.transaction_id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-navy">{TXN_LABELS[t.type] ?? t.type}</p>
                  <p className="text-xs text-navy/45 mt-0.5">{formatDateTime(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-navy">{formatCurrency(t.amount)}</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Balance({ label, value, tone }: { label: string; value: number; tone: 'navy' | 'emerald' | 'amber' }) {
  const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700'
    : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-navy-50/60 text-navy'
  return (
    <div className={`rounded-xl p-3 text-center ${toneClass}`}>
      <p className="text-base font-bold tabular-nums">{formatCurrency(value)}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Sengketa ──────────────────────────────────────────────────────────────────

const RESOLUTION_LABELS: Record<string, string> = {
  free_revision: 'Revisi gratis', charge_justified: 'Biaya dibenarkan',
  partial_refund: 'Pengembalian sebagian', full_refund: 'Pengembalian penuh', quality_sanction: 'Sanksi kualitas',
}

export function DisputePanel({
  project,
  role = 'client',
  disputes,
  onCreate,
}: {
  project: Project
  role?: UserRole
  disputes: Dispute[]
  onCreate: (dispute: Dispute) => void
}) {
  const [formOpen, setFormOpen] = useState(false)

  // Only a project party may open a dispute, and only one can be active at a time.
  const canCreate = role === 'client' || role === 'editor'
  const hasActive = disputes.some(d => d.status === 'open' || d.status === 'in_mediation')
  const showCreate = canCreate && !hasActive

  function handleSubmit(reason: string, evidence: string[]) {
    onCreate({
      dispute_id: `dsp-${Date.now()}`,
      project_id: project.project_id,
      project_title: project.title,
      client_name: project.client_name,
      editor_name: project.editor_name,
      opened_by: role === 'editor' ? project.editor_name : project.client_name,
      opened_by_role: role === 'editor' ? 'editor' : 'client',
      reason,
      evidence: evidence.length ? evidence : undefined,
      status: 'open',
      opened_at: new Date().toISOString(),
      sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    })
  }

  return (
    <div className="space-y-3">
      {disputes.length === 0 ? (
        <div className="text-center py-10">
          <ShieldCheck className="w-9 h-9 mx-auto mb-2 text-emerald-500/70" />
          <p className="text-sm text-navy/60">Tidak ada sengketa pada proyek ini.</p>
          {showCreate && (
            <button onClick={() => setFormOpen(true)} className="btn-secondary text-xs py-2 px-3 mt-4 mx-auto">
              <ShieldAlert className="w-3.5 h-3.5" /> Ajukan sengketa
            </button>
          )}
        </div>
      ) : (
        <>
          {showCreate && (
            <div className="flex justify-end">
              <button onClick={() => setFormOpen(true)} className="btn-secondary text-xs py-2 px-3">
                <ShieldAlert className="w-3.5 h-3.5" /> Ajukan sengketa
              </button>
            </div>
          )}
          {hasActive && <MediatorReviewNotice />}
          {disputes.map(d => (
            <div key={d.dispute_id} className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-navy">Diajukan oleh {d.opened_by}</span>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-sm text-navy/75 leading-relaxed">{d.reason}</p>

              {d.evidence && d.evidence.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {d.evidence.map((name, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-navy-50/40 px-2.5 py-1 text-xs text-navy/70"
                    >
                      <FileText className="w-3 h-3 shrink-0" /> {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-navy/45">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(d.opened_at)}</span>
              </div>
              {d.resolution_type && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      Hasil: {RESOLUTION_LABELS[d.resolution_type] ?? d.resolution_type}
                    </span>
                  </div>
                  {d.resolution_note && <p className="text-xs text-navy/70 leading-relaxed">{d.resolution_note}</p>}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <DisputeForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />
    </div>
  )
}

// Re-export so the detail page can compute tab counts without duplicating filters.
export function tabCounts(project: Project) {
  return {
    hasil: (DELIVERABLES[project.project_id] ?? []).length,
    chat: mockMessages.filter(m => m.project_id === project.project_id).length,
    sengketa: mockDisputes.filter(d => d.project_id === project.project_id).length,
  }
}

export { ArrowRight }
