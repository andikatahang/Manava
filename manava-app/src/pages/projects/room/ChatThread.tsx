// Thread pesan ruang proyek. Setiap message_type punya render khusus:
// text (bubble kiri/kanan), system (pill tengah), brief (kartu penawaran),
// deliverable (kartu preview), revision_request (kartu amber), ai_summary
// (kartu analisis AI). Body brief & ai_summary berupa JSON dari backend baru;
// pesan seed lama berupa teks polos — keduanya didukung.

import { useEffect, useRef } from 'react'
import { FileText, PackageCheck, RefreshCw, Send, Sparkles, Paperclip } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/Badge'
import { formatCurrency, timeAgo } from '../../../lib/utils'
import type { Message } from '../../../types'

interface BriefBody {
  title: string
  description: string
  revision_limit: number
  price: number
}
interface AiSummaryBody {
  label: 'minor' | 'major' | 'uncertain'
  confidence: number
  summary: string
}

function tryParse<T>(body: string): T | null {
  if (!body.startsWith('{')) return null
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

// Warna avatar berdasarkan peran pengirim agar mudah dibedakan sekilas.
const AVATAR_TONE: Record<string, string> = {
  client: 'bg-sky-100 text-sky-700 border-sky-200',
  editor: 'bg-navy/10 text-navy border-navy/15',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

function SenderAvatar({ name, role }: { name: string; role: string }) {
  const tone = AVATAR_TONE[role] ?? 'bg-navy/5 text-navy/60 border-border'
  return (
    <span
      aria-hidden
      className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-semibold ${tone}`}
    >
      {initials(name)}
    </span>
  )
}

export function ChatThread({ messages, myUserId }: { messages: Message[]; myUserId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastId = messages[messages.length - 1]?.message_id

  // Ikuti pesan terbaru setiap kali ada yang masuk.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId])

  return (
    <div
      ref={scrollRef}
      className="h-[460px] overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-[#f4f5f7]"
      aria-live="polite"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-navy/40">
          <span className="w-11 h-11 rounded-full bg-white border border-border flex items-center justify-center">
            <Send className="w-4 h-4" />
          </span>
          <p className="text-xs">Belum ada pesan — mulai percakapan di bawah.</p>
        </div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        // Gabungkan pesan beruntun dari pengirim yang sama: avatar & nama
        // cukup tampil di pesan pertama rangkaian.
        const grouped =
          prev !== undefined &&
          prev.sender_id === m.sender_id &&
          prev.message_type !== 'system' &&
          m.message_type === 'text' &&
          prev.message_type === 'text'
        return (
          <MessageRow
            key={m.message_id}
            message={m}
            mine={m.sender_id === myUserId}
            grouped={grouped}
          />
        )
      })}
    </div>
  )
}

function MessageRow({ message, mine, grouped }: { message: Message; mine: boolean; grouped: boolean }) {
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center px-6">
        <p className="text-[11px] text-navy/50 bg-white/80 border border-border rounded-full px-3.5 py-1.5 text-center leading-relaxed shadow-sm">
          {message.body}
        </p>
      </div>
    )
  }

  const special = message.message_type !== 'text'
  const showMeta = !grouped

  if (mine && !special) {
    return (
      <div className={`flex justify-end ${grouped ? '-mt-2.5' : ''}`}>
        <div className="max-w-[80%]">
          {showMeta && (
            <p className="text-[11px] text-navy/40 mb-1 text-right">
              Anda · {timeAgo(message.created_at)}
            </p>
          )}
          <MessageBody message={message} mine={mine} />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-2.5 ${grouped ? '-mt-2.5' : ''}`}>
      {special || grouped
        ? <span className="w-8 shrink-0" aria-hidden />
        : <SenderAvatar name={message.sender_name} role={message.sender_role} />}
      <div className={`min-w-0 ${special ? 'flex-1 sm:max-w-[85%]' : 'max-w-[80%]'}`}>
        {showMeta && (
          <p className="text-[11px] text-navy/40 mb-1">
            <span className="font-medium text-navy/60">{message.sender_name}</span>
            {' · '}{timeAgo(message.created_at)}
          </p>
        )}
        <MessageBody message={message} mine={mine} />
      </div>
    </div>
  )
}

function MessageBody({ message, mine }: { message: Message; mine: boolean }) {
  switch (message.message_type) {
    case 'brief': {
      const brief = tryParse<BriefBody>(message.body)
      return (
        <SpecialCard icon={FileText} label="Brief Penawaran" tone="navy">
          {brief ? (
            <>
              <h4 className="text-sm font-semibold text-navy">{brief.title}</h4>
              <p className="text-xs text-navy/65 mt-1.5 leading-relaxed whitespace-pre-wrap">{brief.description}</p>
              <dl className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-navy/[0.04] rounded-lg px-2.5 py-2">
                  <dt className="text-navy/50">Batas revisi minor</dt>
                  <dd className="font-semibold text-navy mt-0.5">{brief.revision_limit}x gratis</dd>
                </div>
                <div className="bg-navy/[0.04] rounded-lg px-2.5 py-2">
                  <dt className="text-navy/50">Harga proyek</dt>
                  <dd className="font-semibold text-navy mt-0.5">{formatCurrency(brief.price)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-xs text-navy/70 whitespace-pre-wrap">{message.body}</p>
          )}
        </SpecialCard>
      )
    }
    case 'deliverable': {
      const attach = message.attachment ?? ''
      // Server men-watermark gambar sebagai SVG data URL; PNG/JPEG data URL
      // legacy tetap tampil sebagai gambar. Tautan http(s) → link biasa.
      const isImageInline = attach.startsWith('data:image/')
      return (
        <SpecialCard icon={PackageCheck} label="Preview Hasil Kerja" tone="emerald">
          <p className="text-xs text-navy/75 leading-relaxed whitespace-pre-wrap">{message.body}</p>
          {isImageInline && (
            <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200/70 bg-navy/5">
              <img
                src={attach}
                alt="Preview bertampilan watermark"
                className="w-full max-h-96 object-contain"
                draggable={false}
                onContextMenu={e => e.preventDefault()}
              />
            </div>
          )}
          {attach && !isImageInline && (
            <a
              href={attach}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline mt-2"
            >
              <Paperclip className="w-3.5 h-3.5" /> Buka lampiran preview
            </a>
          )}
        </SpecialCard>
      )
    }
    case 'revision_request':
      return (
        <SpecialCard icon={RefreshCw} label="Permintaan Revisi" tone="amber">
          <p className="text-xs text-navy/75 leading-relaxed whitespace-pre-wrap">{message.body}</p>
        </SpecialCard>
      )
    case 'ai_summary': {
      const ai = tryParse<AiSummaryBody>(message.body)
      return (
        <SpecialCard icon={Sparkles} label="Analisis AI — Kategori Revisi" tone="violet">
          {ai ? (
            <>
              <div className="flex items-center gap-2">
                <StatusBadge status={ai.label} />
                <span className="text-[11px] text-navy/50">
                  keyakinan {(ai.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-navy/75 mt-2 leading-relaxed">{ai.summary}</p>
            </>
          ) : (
            <p className="text-xs text-navy/75 leading-relaxed">{message.body}</p>
          )}
        </SpecialCard>
      )
    }
    default:
      return (
        <div
          className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm ${
            mine
              ? 'bg-navy text-white rounded-br-md'
              : 'bg-white border border-black/5 text-navy rounded-bl-md'
          }`}
        >
          {message.body}
        </div>
      )
  }
}

const TONE_STYLES = {
  navy: 'border-navy/20 bg-white',
  emerald: 'border-emerald-200 bg-emerald-50/60',
  amber: 'border-amber-200 bg-amber-50/70',
  violet: 'border-violet-200 bg-violet-50/60',
} as const

const TONE_ICON = {
  navy: 'text-navy',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  violet: 'text-violet-700',
} as const

function SpecialCard({ icon: Icon, label, tone, children }: {
  icon: typeof FileText
  label: string
  tone: keyof typeof TONE_STYLES
  children: React.ReactNode
}) {
  return (
    <div className={`border rounded-2xl p-3.5 shadow-sm ${TONE_STYLES[tone]}`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 ${TONE_ICON[tone]}`}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      {children}
    </div>
  )
}
