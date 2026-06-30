import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Calendar, CreditCard, CheckCircle2,
  RotateCcw, Briefcase, Upload,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import { formatCurrency } from '../../lib/utils'
import { mockProjects, mockRevisionEnvelopes, mockDisputes, mockReviews } from '../../data/mockData'
import { StageRail } from './StageRail'
import { attentionFor, projectCategory } from './lifecycle'
import {
  OverviewPanel, ContractPanel, DeliverablesPanel, ChatPanel,
  PaymentPanel, DisputePanel, tabCounts, DELIVERABLES,
} from './detailPanels'
import type { DeliverableVersion } from './detailPanels'
import { RatingPanel } from './RatingPanel'
import type { UserRole, RevisionEnvelope, Dispute, Review } from '../../types'

type Tab = 'ringkasan' | 'kontrak' | 'hasil' | 'chat' | 'pembayaran' | 'sengketa' | 'penilaian'

const CLIENT_TABS: { key: Tab; label: string }[] = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'kontrak', label: 'Kontrak' },
  { key: 'hasil', label: 'Hasil Kerja' },
  { key: 'chat', label: 'Chat' },
  { key: 'pembayaran', label: 'Pembayaran' },
  { key: 'sengketa', label: 'Sengketa' },
]

// Editor consolidates Kontrak, Hasil Kerja, and Chat into the project page.
const EDITOR_TABS: { key: Tab; label: string }[] = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'kontrak', label: 'Kontrak' },
  { key: 'hasil', label: 'Hasil Kerja' },
  { key: 'chat', label: 'Chat' },
  { key: 'sengketa', label: 'Sengketa' },
]

const TONE_PILL: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700',
  navy: 'bg-navy-50 text-navy',
  red: 'bg-red-50 text-red-700',
  emerald: 'bg-emerald-50 text-emerald-700',
}

export default function ProjectDetailPage({ role }: { role: UserRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ringkasan')
  const isEditor = role === 'editor'

  const project = mockProjects.find(p => p.project_id === id)

  // Revision Envelope state lives at the page so it survives tab switches and
  // stays in sync between the Ringkasan and Kontrak tabs.
  const [envelope, setEnvelope] = useState<RevisionEnvelope | undefined>(
    () => mockRevisionEnvelopes.find(e => e.project_id === id),
  )
  const [envelopeAgreedAt, setEnvelopeAgreedAt] = useState<string | null>(null)

  // Deliverable versions live at the page so uploads survive tab switches and
  // keep the "Hasil Kerja" tab badge accurate.
  const [deliverables, setDeliverables] = useState<DeliverableVersion[]>(
    () => (id ? DELIVERABLES[id] ?? [] : []),
  )
  const [disputes, setDisputes] = useState<Dispute[]>(
    () => mockDisputes.filter(d => d.project_id === id),
  )
  const [review, setReview] = useState<Review | undefined>(
    () => mockReviews.find(r => r.project_id === id),
  )

  if (!project) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <Briefcase className="w-10 h-10 mx-auto mb-3 text-navy/25" />
        <p className="text-navy font-semibold">Proyek tidak ditemukan</p>
        <p className="text-sm text-navy/50 mt-1">Proyek mungkin telah dihapus atau dipindahkan.</p>
        <button onClick={() => navigate('/projects')} className="btn-secondary mt-5 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Proyek Saya
        </button>
      </div>
    )
  }

  const baseTabs = isEditor ? EDITOR_TABS : CLIENT_TABS
  // The rating tab only appears once the project is completed.
  const TABS = project.status === 'completed'
    ? [...baseTabs, { key: 'penilaian' as Tab, label: 'Penilaian' }]
    : baseTabs

  const counts = tabCounts(project)
  const attention = attentionFor(project.status)
  const { Icon, label: category } = projectCategory(project.title)
  const showPay = !isEditor && (project.status === 'awaiting_dp' || project.status === 'in_review')
  const showRevise = !isEditor && (project.status === 'in_progress' || project.status === 'in_review')
  const showSubmit = isEditor && (project.status === 'in_progress' || project.status === 'revision')

  const badge = (key: Tab) => {
    const n = key === 'hasil' ? deliverables.length : key === 'chat' ? counts.chat : key === 'sengketa' ? disputes.length : 0
    return n > 0 ? n : null
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-sm text-navy/55 hover:text-navy transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Proyek Saya
      </button>

      {/* Hero */}
      <div className="card p-0 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-navy text-white shrink-0">
              <Icon className="w-5.5 h-5.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-navy/40">{category}</span>
                <StatusBadge status={project.status} />
                {attention && project.status !== 'completed' && (
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TONE_PILL[attention.tone])}>
                    {attention.label}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy mt-1.5 leading-tight" style={{ fontFamily: "'Inter Display', sans-serif" }}>
                {project.title}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-navy/55">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {isEditor ? project.client_name : project.editor_name}
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-navy"><CreditCard className="w-3.5 h-3.5" />{formatCurrency(project.project_value)}</span>
                {project.started_at && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Mulai {project.started_at}</span>
                )}
              </div>
            </div>
          </div>

          {/* Signature: lifecycle rail */}
          <div className="mt-6 max-w-xl">
            <StageRail status={project.status} />
          </div>

          {/* Primary actions */}
          {(showPay || showRevise || showSubmit) && (
            <div className="flex gap-2 mt-6 flex-wrap">
              {showPay && (
                <button className="btn-primary text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {project.status === 'awaiting_dp' ? 'Bayar DP' : 'Setujui & bayar pelunasan'}
                </button>
              )}
              {showSubmit && (
                <button className="btn-primary text-sm">
                  <Upload className="w-4 h-4" /> Kirim untuk ditinjau
                </button>
              )}
              {showRevise && (
                <button className="btn-secondary text-sm">
                  <RotateCcw className="w-4 h-4" /> Ajukan revisi
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-border px-2 sm:px-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                tab === t.key ? 'border-navy text-navy' : 'border-transparent text-navy/45 hover:text-navy'
              )}
            >
              {t.label}
              {badge(t.key) && (
                <span className="ml-1.5 bg-navy/10 text-navy text-xs px-1.5 py-0.5 rounded-full">{badge(t.key)}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="card">
        {tab === 'ringkasan' && <OverviewPanel project={project} envelope={envelope} />}
        {tab === 'kontrak' && (
          <ContractPanel
            project={project}
            role={role}
            envelope={envelope}
            agreedAt={envelopeAgreedAt}
            onEnvelopeChange={setEnvelope}
            onAgree={() => setEnvelopeAgreedAt(new Date().toISOString())}
          />
        )}
        {tab === 'hasil' && (
          <DeliverablesPanel
            project={project}
            role={role}
            versions={deliverables}
            onUpload={v => setDeliverables(prev => [v, ...prev])}
          />
        )}
        {tab === 'chat' && <ChatPanel project={project} />}
        {tab === 'pembayaran' && <PaymentPanel project={project} />}
        {tab === 'sengketa' && (
          <DisputePanel
            project={project}
            role={role}
            disputes={disputes}
            onCreate={d => setDisputes(prev => [d, ...prev])}
          />
        )}
        {tab === 'penilaian' && project.status === 'completed' && (
          <RatingPanel
            project={project}
            role={role}
            review={review}
            onSubmit={(rating, comment) => setReview({
              review_id: `rev-${Date.now()}`,
              project_id: project.project_id,
              rating,
              comment,
              reviewer_name: project.client_name,
              created_at: new Date().toISOString(),
            })}
          />
        )}
      </div>
    </div>
  )
}
