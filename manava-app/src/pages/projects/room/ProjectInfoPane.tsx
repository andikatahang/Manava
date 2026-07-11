// Panel kanan ruang proyek — informasi lawan chat dan dokumen proyek:
// brief/kontrak (klien bisa setujui/tolak di sini), preview hasil kerja,
// serta unduhan file final saat proyek selesai.

import { CheckCircle2, Download, FileText, PackageCheck, Paperclip, X } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/Badge'
import { formatCurrency, formatDate, timeAgo } from '../../../lib/utils'
import type { Contract, DownloadableFile, Message } from '../../../types'
import type { ProjectDetail } from '../../../hooks/queries/useProjectRoom'

interface RespondBriefMutation {
  mutate: (approve: boolean) => void
  isPending: boolean
  isError: boolean
  error: Error | null
}

const CONTRACT_LABEL: Record<Contract['status'], string> = {
  draft: 'Draf',
  pending_client_approval: 'Menunggu persetujuan',
  active: 'Aktif',
  superseded: 'Digantikan',
  closed: 'Selesai',
  rejected: 'Ditolak',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ProjectInfoPane({
  project, access, counterpart, deliverables,
  downloads, downloadsLoading, onDownload, respondBrief, reviewSlot,
}: {
  project: ProjectDetail
  access: 'client' | 'editor' | 'staff'
  counterpart: { name: string; role: string }
  deliverables: Message[]
  downloads: DownloadableFile[] | undefined
  downloadsLoading: boolean
  onDownload: (dataUrl: string, filename: string) => void
  respondBrief: RespondBriefMutation
  reviewSlot: React.ReactNode
}) {
  const contracts = [...project.contracts].sort(
    (a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime(),
  )

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      {/* Info lawan chat */}
      <section className="px-4 py-4 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-3">
          Info Lawan Chat
        </p>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="w-12 h-12 shrink-0 rounded-full bg-navy/10 border border-navy/15 flex items-center justify-center text-sm font-semibold text-navy"
          >
            {initials(counterpart.name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy leading-snug">{counterpart.name}</p>
            <p className="text-[11px] text-navy/50 mt-0.5">{counterpart.role}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-navy/50">Status proyek</dt>
            <dd><StatusBadge status={project.status} /></dd>
          </div>
          {project.project_value > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-navy/50">Nilai proyek</dt>
              <dd className="font-semibold text-navy">{formatCurrency(project.project_value)}</dd>
            </div>
          )}
          {project.envelope && project.status !== 'draft' && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-navy/50">Revisi minor</dt>
              <dd className="font-semibold text-navy">
                {project.envelope.allowance_consumed}/{project.envelope.allowance_count} terpakai
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-navy/50">Dibuat</dt>
            <dd className="text-navy/70">{formatDate(project.created_at)}</dd>
          </div>
        </dl>
      </section>

      {/* Dokumen proyek — brief/kontrak */}
      <section className="px-4 py-4 border-b border-border">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-3">
          <FileText className="w-3.5 h-3.5" /> Project Brief
        </p>
        {contracts.length === 0 && (
          <p className="text-xs text-navy/40">
            Belum ada brief — {access === 'editor'
              ? 'kirim brief penawaran lewat tombol + di kolom chat.'
              : 'staf akan mengirim brief penawaran setelah diskusi.'}
          </p>
        )}
        <div className="space-y-2.5">
          {contracts.map(c => {
            const pending = c.status === 'pending_client_approval'
            return (
              <div
                key={c.contract_id}
                className={`rounded-xl border p-3 ${
                  pending ? 'border-navy/30 bg-white shadow-sm' : 'border-border bg-white/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-navy leading-snug">
                    {c.title ?? project.title}
                  </p>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${
                    pending ? 'bg-amber-50 text-amber-700'
                      : c.status === 'active' || c.status === 'closed' ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {CONTRACT_LABEL[c.status]}
                  </span>
                </div>
                <p className="text-[11px] text-navy/55 mt-1.5 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {c.scope}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-navy/60">
                  <span>Revisi: <strong className="text-navy">{c.revision_limit}x gratis</strong></span>
                  <span>Harga: <strong className="text-navy">{formatCurrency(c.project_value)}</strong></span>
                </div>

                {/* Keputusan brief oleh klien */}
                {pending && access === 'client' && (
                  <>
                    {respondBrief.isError && (
                      <p className="text-[11px] text-red-600 mt-2">{respondBrief.error?.message}</p>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      <button
                        onClick={() => respondBrief.mutate(true)}
                        disabled={respondBrief.isPending}
                        className="btn-primary text-[11px] px-2.5 py-1.5 flex-1 justify-center disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                      </button>
                      <button
                        onClick={() => respondBrief.mutate(false)}
                        disabled={respondBrief.isPending}
                        className="btn-secondary text-[11px] px-2.5 py-1.5 flex-1 justify-center disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Dokumen proyek — preview hasil kerja */}
      <section className="px-4 py-4 border-b border-border">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-3">
          <PackageCheck className="w-3.5 h-3.5" /> Preview Proyek
        </p>
        {deliverables.length === 0 && (
          <p className="text-xs text-navy/40">Belum ada preview hasil kerja.</p>
        )}
        <div className="space-y-2.5">
          {deliverables.map(d => {
            const attach = d.attachment ?? ''
            const isImage = attach.startsWith('data:image/')
            return (
              <div key={d.message_id} className="flex items-center gap-2.5 rounded-xl border border-border bg-white/60 p-2.5">
                {isImage ? (
                  <span className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-border bg-navy/5">
                    <img src={attach} alt="" className="w-full h-full object-cover" draggable={false} />
                  </span>
                ) : (
                  <span className="w-11 h-11 shrink-0 rounded-lg border border-border bg-navy/5 flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-navy/40" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-navy/70 leading-snug line-clamp-2">{d.body}</span>
                  <span className="block text-[10px] text-navy/40 mt-0.5">{timeAgo(d.created_at)}</span>
                </span>
                {attach && !isImage && (
                  <a
                    href={attach}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-blue-700 hover:underline shrink-0"
                  >
                    Buka
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Unduhan file final — klien, proyek selesai */}
      {project.status === 'completed' && access === 'client' && (
        <section className="px-4 py-4 border-b border-border">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-3">
            <Download className="w-3.5 h-3.5" /> Unduh Hasil Akhir
          </p>
          {downloadsLoading && <p className="text-xs text-navy/50">Memuat file…</p>}
          {downloads && downloads.length === 0 && (
            <p className="text-xs text-navy/40">
              Tidak ada file gambar untuk diunduh — preview dikirim lewat tautan eksternal.
            </p>
          )}
          <div className="space-y-2.5">
            {(downloads ?? []).map(file => {
              const isImage = file.download_url.startsWith('data:image/')
              const ext = file.download_url.match(/^data:image\/(\w+)/)?.[1] ?? 'png'
              const safeName = `${project.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'manava'}-${file.file_label.replace(/\s+/g, '-')}.${ext}`
              return (
                <div key={file.message_id} className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white/80 p-2.5">
                  {file.preview_url?.startsWith('data:image/') && (
                    <span className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-border bg-navy/5">
                      <img src={file.preview_url} alt={file.file_label} className="w-full h-full object-cover" draggable={false} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-navy truncate">{file.file_label}</span>
                    <span className="block text-[10px] text-navy/40 mt-0.5">{formatDate(file.created_at)}</span>
                  </span>
                  {isImage ? (
                    <button
                      onClick={() => onDownload(file.download_url, safeName)}
                      className="btn-primary text-[11px] px-2.5 py-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </button>
                  ) : (
                    <a
                      href={file.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-[11px] px-2.5 py-1.5 shrink-0 inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Buka
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Ulasan (selesai) */}
      {reviewSlot && <section className="px-4 py-4">{reviewSlot}</section>}
    </div>
  )
}
