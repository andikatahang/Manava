// Home editor: kotak masuk (pesan terbaru dari klien lintas ruang proyek),
// proyek yang sedang aktif, dan riwayat pesanan yang pernah dikerjakan.
// Cermin dari ClientHome — perbedaan utama: perspektif editor (menerima chat
// dari klien, kirim brief/preview, tunggu pembayaran DP).

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertOctagon, Briefcase, ClipboardCheck, FileText, Inbox, MessageSquare,
  PackageCheck, RefreshCw, Settings, Sparkles, UserCheck, Wallet,
} from 'lucide-react'
import { HomeHero } from '../../components/home/HomeHero'
import { FeatureGrid } from '../../components/home/FeatureGrid'
import { StatusBadge } from '../../components/ui/Badge'
import { useProjects } from '../../hooks/queries/useProjects'
import { useEditors } from '../../hooks/queries/useEditors'
import { DetailBody } from '../performance/PerformancePage'
import { useProjectInbox } from '../../hooks/queries/useProjectRoom'
import { formatCurrency, timeAgo } from '../../lib/utils'
import type { InboxItem, Project, User } from '../../types'

const ACTIVE_STATUSES = ['draft', 'awaiting_dp', 'in_progress', 'in_review', 'revision', 'disputed'] as const

// Snippet inbox dari perspektif editor: pengirim adalah klien, jadi label
// pesan diarahkan ke tindakan yang biasanya perlu dilakukan editor.
function inboxSnippet(item: InboxItem): string {
  switch (item.message_type) {
    case 'brief': return 'Brief yang Anda kirim menunggu tanggapan klien.'
    case 'deliverable': return 'Preview yang Anda kirim sedang ditinjau klien.'
    case 'revision_request': return `Permintaan revisi klien: ${item.body}`
    case 'ai_summary': return 'Ringkasan AI atas permintaan revisi terbaru.'
    case 'system': return item.body
    default: return item.body
  }
}

const INBOX_ICONS = {
  text: MessageSquare,
  brief: FileText,
  deliverable: PackageCheck,
  revision_request: RefreshCw,
  ai_summary: Sparkles,
  system: Inbox,
} as const

export default function EditorHome({ user }: { user: User }) {
  const navigate = useNavigate()
  const projectsQuery = useProjects()
  const inboxQuery = useProjectInbox()
  const editorsQuery = useEditors()
  const myMetrics = (editorsQuery.data ?? []).find(e => e.user_id === user.user_id)?.metrics ?? null

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const active = useMemo(
    () => projects.filter(p => (ACTIVE_STATUSES as readonly string[]).includes(p.status)),
    [projects],
  )
  const history = useMemo(
    () => projects.filter(p => p.status === 'completed' || p.status === 'cancelled'),
    [projects],
  )
  const inbox = (inboxQuery.data ?? []).slice(0, 6)

  return (
    <div
      className="space-y-7 sm:space-y-8 max-w-[1140px] mx-auto"
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      <HomeHero
        fullName={user.full_name}
        roleLabel="Staf"
        subtitle="Balas chat klien, kirim brief penawaran, dan pantau proyek yang sedang berjalan."
      />

      {/* Ringkasan KPI pribadi (compact) — dipindah dari halaman Grafik & Indeks Kepuasan Klien */}
      {myMetrics && (
        <section className="card">
          <DetailBody metrics={myMetrics} compact />
        </section>
      )}

      <FeatureGrid
        title="Akses cepat"
        features={[
          { label: 'Proyek Saya',     to: '/projects', icon: Briefcase,       accent: 'lime' },
          { label: 'Layanan Mandiri', to: '/ess',      icon: UserCheck,       accent: 'cyan' },
          { label: 'Ajukan Cuti',     to: '/ess',      icon: ClipboardCheck,  accent: 'pink' },
          { label: 'Slip Gaji',       to: '/ess',      icon: Wallet,          accent: 'emerald' },
          { label: 'Peringatan Saya', to: '/warning',  icon: AlertOctagon,    accent: 'amber' },
          { label: 'Pengaturan',      to: '/settings', icon: Settings,        accent: 'navy' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kotak masuk — pesan dari klien */}
        <section className="card no-hover lg:order-2">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[#021526] flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-[#596074]" /> Kotak Masuk
            </h2>
            {inbox.length > 0 && (
              <span className="text-[11px] font-semibold text-[#596074]">{inbox.length} terbaru</span>
            )}
          </header>
          {inboxQuery.isLoading ? (
            <p className="text-xs text-[#596074] py-6 text-center">Memuat…</p>
          ) : inbox.length === 0 ? (
            <p className="text-xs text-[#596074] py-6 text-center">
              Belum ada pesan dari klien. Klien akan mengontak Anda lewat halaman Cari Jasa.
            </p>
          ) : (
            <ul className="divide-y divide-[#EDEDED] -mx-2">
              {inbox.map(item => {
                const Icon = INBOX_ICONS[item.message_type] ?? MessageSquare
                return (
                  <li key={item.message_id}>
                    <button
                      onClick={() => navigate(`/projects/${item.project_id}`)}
                      className="w-full flex items-start gap-2.5 px-2 py-2.5 text-left hover:bg-[#021526]/[0.03] rounded-lg transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#021526]/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-[#021526]/70" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-semibold text-[#021526] truncate">
                          {item.sender_name}
                          <span className="font-normal text-[#596074]"> · {timeAgo(item.created_at)}</span>
                        </span>
                        <span className="block text-[11.5px] text-[#596074] truncate">{inboxSnippet(item)}</span>
                        <span className="block text-[11px] text-[#021526]/45 truncate mt-0.5">{item.project_title}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Proyek aktif + riwayat */}
        <div className="lg:col-span-2 space-y-6 lg:order-1">
          <section>
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-[#021526]">Proyek Aktif</h2>
              <Link to="/projects" className="text-[12px] font-medium text-[#021526]/60 hover:text-[#021526]">
                Lihat semua →
              </Link>
            </header>
            {projectsQuery.isLoading ? (
              <p className="text-xs text-[#596074]">Memuat proyek…</p>
            ) : active.length === 0 ? (
              <div className="card no-hover text-center py-8">
                <p className="text-sm text-[#596074]">Belum ada proyek aktif — klien belum mengontak Anda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 4).map(p => <ActiveProjectRow key={p.project_id} project={p} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-[#021526] mb-3">Riwayat Pesanan</h2>
            {history.length === 0 ? (
              <p className="text-xs text-[#596074]">Belum ada proyek yang selesai.</p>
            ) : (
              <div className="card no-hover divide-y divide-[#EDEDED] py-1">
                {history.slice(0, 6).map(p => (
                  <div key={p.project_id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#021526] truncate">{p.title}</p>
                      <p className="text-[11.5px] text-[#596074] truncate">
                        {p.client_name}
                        {p.project_value > 0 && <> · {formatCurrency(p.project_value)}</>}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                    <Link
                      to={`/projects/${p.project_id}`}
                      className="shrink-0 text-[11.5px] font-medium text-[#021526]/55 hover:text-[#021526]"
                    >
                      Buka
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function ActiveProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate()
  // Hint dari perspektif editor — apa langkah berikutnya untuk saya?
  const hint =
    project.status === 'draft' ? 'Klien menunggu brief penawaran Anda.'
    : project.status === 'awaiting_dp' ? 'Menunggu klien membayar DP sebelum mulai kerja.'
    : project.status === 'in_progress' ? 'Sedang dikerjakan — kirim preview jika siap.'
    : project.status === 'in_review' ? 'Preview sedang ditinjau klien.'
    : project.status === 'revision' ? 'Ada permintaan revisi klien untuk dikerjakan.'
    : project.status === 'disputed' ? 'Proyek dalam sengketa — mediator akan menghubungi.'
    : 'Proyek berjalan.'

  return (
    <button
      onClick={() => navigate(`/projects/${project.project_id}`)}
      className="card w-full text-left flex items-center gap-4 hover:border-navy/30 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#021526] truncate">{project.title}</h3>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-xs text-[#596074] mt-1 truncate">{project.client_name} · {hint}</p>
      </div>
      {project.project_value > 0 && (
        <span className="text-sm font-bold text-[#021526] shrink-0">{formatCurrency(project.project_value)}</span>
      )}
    </button>
  )
}
