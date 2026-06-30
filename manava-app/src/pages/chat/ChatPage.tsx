import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Bot, ChevronLeft, X, FileText, Inbox, CreditCard, User } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { StageRail } from '../projects/StageRail'
import { projectCategory, attentionFor } from '../projects/lifecycle'
import { mockProjects, mockMessages, mockUsers } from '../../data/mockData'
import { formatCurrency, formatDate, formatDateTime, timeAgo } from '../../lib/utils'
import type { Message, Project } from '../../types'

const MSG_TAG: Record<string, string> = {
  brief: 'Brief',
  deliverable: 'Hasil kerja',
  revision_request: 'Permintaan revisi',
}

const TONE_PILL: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700',
  navy: 'bg-navy-50 text-navy',
  red: 'bg-red-50 text-red-700',
  emerald: 'bg-emerald-50 text-emerald-700',
}

const me = mockUsers.editor // the signed-in editor (route /chat is editor-only)

// Conversations are this editor's live projects (one thread per project).
const conversations = mockProjects.filter(
  p => p.editor_id === 'e1' && !['draft', 'cancelled'].includes(p.status),
)

export default function ChatPage() {
  const [activeId, setActiveId] = useState(conversations[0].project_id)
  const [extra, setExtra] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<string | null>(null)
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list')

  const fileRef = useRef<HTMLInputElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const active = conversations.find(p => p.project_id === activeId)!
  const thread = [...mockMessages, ...extra]
    .filter(m => m.project_id === activeId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeId, extra])

  function openConversation(p: Project) {
    setActiveId(p.project_id)
    setMobilePane('chat')
    setAttachment(null)
    setDraft('')
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAttachment(file.name)
    e.target.value = '' // allow re-selecting the same file
  }

  function send() {
    const text = draft.trim()
    if (!text && !attachment) return
    setExtra(prev => [
      ...prev,
      {
        message_id: `local-${Date.now()}`,
        project_id: activeId,
        sender_id: me.user_id,
        sender_name: me.full_name,
        sender_role: 'editor',
        body: text,
        message_type: 'text',
        attachment: attachment ?? undefined,
        created_at: new Date().toISOString(),
      },
    ])
    setDraft('')
    setAttachment(null)
  }

  function lastMessage(projectId: string): Message | undefined {
    const msgs = [...mockMessages, ...extra].filter(m => m.project_id === projectId)
    return msgs[msgs.length - 1]
  }

  function previewText(last: Message | undefined): string {
    if (!last) return 'Belum ada pesan'
    if (!last.body && last.attachment) return `Lampiran: ${last.attachment}`
    return last.body
  }

  const { Icon: CategoryIcon, label: category } = projectCategory(active.title)
  const attention = attentionFor(active.status)
  const history = [
    { label: 'Proyek dibuat', date: active.created_at },
    active.started_at ? { label: 'Pengerjaan dimulai', date: active.started_at } : null,
    active.completed_at ? { label: 'Proyek selesai', date: active.completed_at } : null,
  ].filter((h): h is { label: string; date: string } => h !== null)

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-[8px] border border-black/[0.05] bg-[#fbfbfb] overflow-hidden">

      {/* ── Conversation list ── */}
      <aside
        className={`${mobilePane === 'chat' ? 'hidden' : 'flex'} lg:flex w-full lg:w-72 flex-shrink-0 flex-col border-r border-[#EDEDED]`}
      >
        <div className="px-4 py-3.5 border-b border-[#EDEDED]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#596074]">Percakapan</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(p => {
            const isActive = p.project_id === activeId
            const last = lastMessage(p.project_id)
            return (
              <button
                key={p.project_id}
                onClick={() => openConversation(p)}
                aria-current={isActive ? 'true' : undefined}
                className={`w-full text-left flex gap-3 px-4 py-3 border-b border-[#EDEDED] transition-colors ${
                  isActive ? 'bg-white border-l-2 border-l-[#D0F100]' : 'hover:bg-[#021526]/[0.03]'
                }`}
              >
                <Avatar name={p.client_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[#021526] truncate">{p.client_name}</p>
                    <span className="text-[11px] text-[#9aa3bd] flex-shrink-0">{timeAgo((last ?? p).created_at)}</span>
                  </div>
                  <p className="text-[12.5px] text-[#596074] truncate">{p.title}</p>
                  <p className="text-[12px] text-[#9aa3bd] truncate mt-0.5">{previewText(last)}</p>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Chat window ── */}
      <section className={`${mobilePane === 'list' ? 'hidden' : 'flex'} lg:flex flex-1 flex-col min-w-0 bg-white`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDED]">
          <button
            onClick={() => setMobilePane('list')}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-[#596074] hover:bg-[#021526]/[0.04]"
            aria-label="Kembali ke daftar percakapan"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar name={active.client_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#021526] truncate">{active.client_name}</p>
            <p className="text-[12px] text-[#596074] truncate">{active.title}</p>
          </div>
          <StatusBadge status={active.status} />
        </div>

        {/* Messages */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          {thread.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#9aa3bd]">
              <Inbox className="w-9 h-9 mb-2 opacity-50" />
              <p className="text-[13px]">Belum ada pesan pada proyek ini</p>
            </div>
          ) : (
            thread.map(m => <MessageRow key={m.message_id} message={m} mine={m.sender_id === me.user_id} />)
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[#EDEDED] px-3 py-3">
          {attachment && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#fbfbfb] pl-3 pr-2 py-1.5">
              <FileText className="w-3.5 h-3.5 text-[#596074]" />
              <span className="text-[12.5px] text-[#021526] max-w-[200px] truncate">{attachment}</span>
              <button
                onClick={() => setAttachment(null)}
                className="p-0.5 rounded text-[#9aa3bd] hover:text-[#021526]"
                aria-label="Hapus lampiran"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" className="hidden" onChange={pickFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2.5 rounded-xl border border-[#EDEDED] text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors flex-shrink-0"
              aria-label="Lampirkan berkas"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Tulis pesan…"
              aria-label="Tulis pesan"
              className="flex-1 px-4 py-2.5 text-[14px] rounded-xl border border-[#EDEDED] bg-[#fbfbfb] text-[#021526] placeholder:text-[#9aa3bd] focus:outline-none focus:border-[#021526]/40 focus:ring-2 focus:ring-[#021526]/8 transition-all"
            />
            <button
              onClick={send}
              className="p-2.5 rounded-xl bg-[#021526] text-white hover:bg-[#032b4a] transition-colors flex-shrink-0"
              aria-label="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Project history panel ── */}
      <aside className="hidden xl:flex w-80 flex-shrink-0 flex-col border-l border-[#EDEDED]">
        <div className="px-5 py-3.5 border-b border-[#EDEDED]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#596074]">Detail Proyek</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-navy text-white shrink-0">
                <CategoryIcon className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa3bd]">{category}</span>
            </div>
            <h2 className="text-[16px] font-bold text-[#021526] leading-snug">{active.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={active.status} />
              {attention && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TONE_PILL[attention.tone]}`}>
                  {attention.label}
                </span>
              )}
            </div>
          </div>

          {/* Facts */}
          <div className="space-y-2.5">
            <Fact icon={User} label="Klien" value={active.client_name} />
            <Fact icon={CreditCard} label="Nilai proyek" value={formatCurrency(active.project_value)} />
          </div>

          {/* Lifecycle */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#596074] mb-3">Tahapan</p>
            <StageRail status={active.status} />
          </div>

          {/* History timeline */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#596074] mb-3">Riwayat</p>
            <ol>
              {history.map((h, i) => (
                <li key={h.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-navy mt-1 shrink-0" />
                    {i < history.length - 1 && <span className="w-px flex-1 bg-navy/15 my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[13.5px] font-medium text-[#021526] leading-tight">{h.label}</p>
                    <p className="text-[12px] text-[#9aa3bd] mt-0.5">{formatDate(h.date)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-[#9aa3bd]">{thread.length} pesan dalam percakapan ini.</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-navy-50/60 text-navy shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-[#9aa3bd]">{label}</p>
        <p className="text-[13.5px] font-semibold text-[#021526] truncate">{value}</p>
      </div>
    </div>
  )
}

function MessageRow({ message: m, mine }: { message: Message; mine: boolean }) {
  // System & AI notices render as centered info pills.
  if (m.message_type === 'system' || m.message_type === 'ai_summary') {
    const isAi = m.message_type === 'ai_summary'
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 max-w-[85%] text-center text-[12px] text-[#596074] bg-[#021526]/[0.04] rounded-full px-3 py-1.5">
          {isAi && <Bot className="w-3.5 h-3.5 text-[#0050F8] shrink-0" />}
          {m.body}
        </span>
      </div>
    )
  }

  const tag = MSG_TAG[m.message_type]
  return (
    <div className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && <Avatar name={m.sender_name} size="sm" />}
      <div className={`max-w-[78%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${
            mine ? 'bg-[#021526] text-white rounded-tr-sm' : 'bg-[#fbfbfb] border border-[#EDEDED] text-[#021526] rounded-tl-sm'
          }`}
        >
          {tag && (
            <span className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${mine ? 'text-white/60' : 'text-[#9aa3bd]'}`}>
              {tag}
            </span>
          )}
          {m.body}
          {m.attachment && (
            <span
              className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${
                mine ? 'bg-white/10 text-white/90' : 'bg-white border border-[#EDEDED] text-[#021526]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{m.attachment}</span>
            </span>
          )}
        </div>
        <span className="text-[10.5px] text-[#9aa3bd] mt-1 px-1">
          {!mine && `${m.sender_name} · `}{formatDateTime(m.created_at)}
        </span>
      </div>
    </div>
  )
}
