// Panel kiri ruang proyek — daftar proyek sebagai daftar percakapan.
// Klik item berpindah ruang tanpa keluar dari tata letak messenger.

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/Badge'
import { timeAgo } from '../../../lib/utils'
import type { Project, UserRole } from '../../../types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

function counterpartName(project: Project, role: UserRole): string {
  if (role === 'client') return project.editor_name
  if (role === 'editor') return project.client_name
  return `${project.client_name} · ${project.editor_name}`
}

export function ConversationList({ projects, activeId, role, onSelect }: {
  projects: Project[]
  activeId?: string
  role: UserRole
  onSelect: (projectId: string) => void
}) {
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(p =>
      p.title.toLowerCase().includes(q) || counterpartName(p, role).toLowerCase().includes(q),
    )
  }, [projects, query, role])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/45 mb-2.5">
          Percakapan
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-navy/35 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-full border border-border bg-[#f4f5f7] text-xs
                       focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 focus:bg-white
                       placeholder:text-gray-400 transition-all duration-150"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari proyek atau nama…"
            aria-label="Cari percakapan"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
        {items.length === 0 && (
          <p className="text-xs text-navy/40 text-center py-8 px-4">
            {query ? 'Tidak ada percakapan yang cocok.' : 'Belum ada proyek.'}
          </p>
        )}
        {items.map(p => {
          const active = p.project_id === activeId
          const name = counterpartName(p, role)
          return (
            <button
              key={p.project_id}
              onClick={() => onSelect(p.project_id)}
              aria-current={active ? 'true' : undefined}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
                active
                  ? 'bg-navy/[0.05] border-navy'
                  : 'border-transparent hover:bg-navy/[0.03]'
              }`}
            >
              <span
                aria-hidden
                className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-semibold ${
                  active ? 'bg-navy text-white border-navy' : 'bg-navy/10 text-navy border-navy/15'
                }`}
              >
                {initials(name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-navy truncate">{name}</span>
                  <span className="text-[10px] text-navy/40 shrink-0">{timeAgo(p.created_at)}</span>
                </span>
                <span className="block text-[11px] text-navy/50 truncate mt-0.5">{p.title}</span>
                <span className="block mt-1.5">
                  <StatusBadge status={p.status} />
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
