import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Briefcase, CreditCard, Settings, Star, ArrowRight, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency } from '../../lib/utils'
import { mockProjects, mockEditors, mockUsers } from '../../data/mockData'

const ACTIVE_PROJECT_STATUSES = ['awaiting_dp', 'in_progress', 'in_review', 'revision', 'disputed']

const SPECIALIZATION_LABELS: Record<string, string> = {
  product_retouch: 'Product Retouch',
  color_correction: 'Color Correction',
  portrait_retouch: 'Portrait Retouch',
  background_removal: 'Background Removal',
  video_edit: 'Video Edit',
  color_grading: 'Color Grading',
  motion_graphics: 'Motion Graphics',
  vfx: 'VFX',
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'Semua' },
  ...Object.entries(SPECIALIZATION_LABELS).map(([key, label]) => ({ key, label })),
]

const QUICK_ACTIONS = [
  { to: '/browse-editors', icon: Search, label: 'Cari Editor', desc: 'Temukan talenta' },
  { to: '/projects', icon: Briefcase, label: 'Proyek Saya', desc: 'Pantau progres' },
  { to: '/projects', icon: CreditCard, label: 'Pembayaran', desc: 'Status escrow' },
  { to: '/settings', icon: Settings, label: 'Pengaturan', desc: 'Akun & preferensi' },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function ClientHomePage({ userName }: { userName?: string }) {
  const name = userName ?? mockUsers.client.full_name
  const me = mockUsers.client
  const [category, setCategory] = useState('all')

  const myProjects = mockProjects.filter(
    p => p.client_id === me.user_id && ACTIVE_PROJECT_STATUSES.includes(p.status)
  )

  const editors = mockEditors.filter(e => e.status === 'active')
  const visibleEditors = category === 'all'
    ? editors
    : editors.filter(e => e.specialization.includes(category))

  return (
    <div className="space-y-9">
      {/* 1 — Profile & greeting */}
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center text-lg font-bold shrink-0">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-navy/50">{greeting()},</p>
          <h1 className="text-xl font-bold text-navy leading-tight truncate">{name}</h1>
        </div>
      </header>

      {/* 2 — Active projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-navy">Proyek Sedang Dikerjakan</h2>
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-navy/60 hover:text-navy transition-colors">
            Semua proyek <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {myProjects.length === 0 ? (
          <div className="card text-center py-10 text-navy/40">
            <Briefcase className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada proyek berjalan.</p>
            <Link to="/browse-editors" className="btn-primary mt-4 inline-flex">Mulai proyek baru</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {myProjects.map(p => (
              <Link key={p.project_id} to={`/projects/${p.project_id}`} className="card block hover:no-underline">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-navy leading-snug">{p.title}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-navy/50 mt-1 line-clamp-1">{p.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-navy/50">Editor · <span className="font-medium text-navy">{p.editor_name}</span></span>
                  <span className="text-sm font-bold text-navy">{formatCurrency(p.project_value)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3 — Quick actions */}
      <section>
        <h2 className="text-base font-semibold text-navy mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="card group flex items-center gap-3 !p-4 hover:no-underline"
            >
              <span className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy shrink-0 group-hover:bg-navy group-hover:text-white transition-colors">
                <a.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy leading-tight">{a.label}</span>
                <span className="block text-xs text-navy/45 truncate">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4 — Editor categories (horizontal scroll) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-navy">Jelajahi Editor</h2>
          <Link to="/browse-editors" className="inline-flex items-center gap-1 text-sm font-medium text-navy/60 hover:text-navy transition-colors">
            Lihat semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                category === c.key ? 'bg-navy text-white' : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e8e8e8]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* 5 — Editor cards: 2 col mobile, 4 col desktop */}
      <section>
        {visibleEditors.length === 0 ? (
          <div className="card text-center py-10 text-navy/40">
            <Search className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Tidak ada editor pada kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleEditors.map(ed => (
              <Link key={ed.editor_id} to="/browse-editors" className="hover:no-underline">
                <Card
                  title={ed.full_name}
                  desc={ed.department}
                  className="min-h-0"
                  media={
                    <div className="relative">
                      <img
                        src={ed.avatar}
                        alt={ed.full_name}
                        width={240}
                        height={160}
                        loading="lazy"
                        className="w-full h-36 object-cover rounded-[6px]"
                      />
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-navy text-xs font-bold px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {ed.rating.toFixed(1)}
                      </span>
                    </div>
                  }
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* footer CTA */}
      <Link
        to="/browse-editors"
        className="card group flex items-center justify-between gap-3 hover:no-underline"
      >
        <div>
          <p className="font-semibold text-navy">Punya proyek baru?</p>
          <p className="text-sm text-navy/50">Cari editor yang tepat dan kunci lingkupnya hari ini.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded-xl group-hover:bg-[#032b4a] transition-colors shrink-0">
          Mulai <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </div>
  )
}
