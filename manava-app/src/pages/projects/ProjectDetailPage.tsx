import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Calendar, CreditCard, CheckCircle2, Eye,
  Briefcase, Upload,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import { formatCurrency, formatDate } from '../../lib/utils'
import { mockProjects, mockRevisionEnvelopes, mockDisputes, mockReviews } from '../../data/mockData'
import { StageRail } from './StageRail'
import { attentionFor, projectCategory } from './lifecycle'
import {
  OverviewPanel, ContractPanel, DeliverablesPanel, ChatPanel,
  PaymentPanel, DisputePanel, tabCounts, DELIVERABLES,
} from './detailPanels'
import type { DeliverableVersion } from './detailPanels'
import { projectOffers } from './workflow'
import type { ProjectOffer } from './workflow'
import { RatingPanel } from './RatingPanel'
import type { UserRole, ProjectStatus, RevisionEnvelope, Dispute, Review } from '../../types'

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

// Keyed by project id so per-project state (status, offer, deliverables…)
// resets when navigating directly between two project detail pages.
export default function ProjectDetailPage({ role }: { role: UserRole }) {
  const { id } = useParams()
  return <ProjectDetail key={id} role={role} />
}

function ProjectDetail({ role }: { role: UserRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ringkasan')
  const isEditor = role === 'editor'

  const project = mockProjects.find(p => p.project_id === id)

  // Live workflow state. Status transitions (offer accepted → in_progress →
  // in_review → completed/disputed) happen here; changes are written back to
  // the mock stores so they survive navigating away and back (prototype-only).
  const [status, setStatusState] = useState<ProjectStatus>(() => project?.status ?? 'draft')
  const [offer, setOfferState] = useState<ProjectOffer | null>(
    () => (id ? projectOffers[id] ?? null : null),
  )

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

  // Merged view: the found mock project + live workflow status.
  const proj = { ...project, status }

  function setStatus(next: ProjectStatus) {
    setStatusState(next)
    project!.status = next // persist across navigation (mock store)
  }

  function setOffer(next: ProjectOffer) {
    setOfferState(next)
    projectOffers[project!.project_id] = next
  }

  function syncDeliverables(next: DeliverableVersion[]) {
    setDeliverables(next)
    DELIVERABLES[project!.project_id] = next
  }

  // ── Workflow transitions ──
  function handleOfferResponse(accepted: boolean) {
    if (!offer) return
    setOffer({ ...offer, status: accepted ? 'accepted' : 'rejected' })
    if (accepted) {
      // Offer terms become the project's commercial terms; work starts now.
      project!.project_value = offer.price
      project!.dp_amount = offer.price / 2
      project!.final_amount = offer.price / 2
      project!.started_at = new Date().toISOString().slice(0, 10)
      setStatus('in_progress')
    }
  }

  function handleUpload(v: DeliverableVersion) {
    syncDeliverables([v, ...deliverables])
    setStatus('in_review')
  }

  function handleApprove(v: DeliverableVersion) {
    syncDeliverables(deliverables.map(d =>
      d.version === v.version ? { ...d, status: 'approved' as const } : d,
    ))
    project!.completed_at = new Date().toISOString().slice(0, 10)
    setStatus('completed')
  }

  // Minor revision confirmed by the client — work returns to the editor.
  function handleRevisionRequest(v: DeliverableVersion) {
    syncDeliverables(deliverables.map(d =>
      d.version === v.version ? { ...d, status: 'revision_requested' as const } : d,
    ))
    setStatus('in_progress')
  }

  function handleDisputeCreate(d: Dispute) {
    setDisputes(prev => [d, ...prev])
    setStatus('disputed')
  }

  const baseTabs = isEditor ? EDITOR_TABS : CLIENT_TABS
  // The rating tab only appears once the project is completed.
  const TABS = status === 'completed'
    ? [...baseTabs, { key: 'penilaian' as Tab, label: 'Penilaian' }]
    : baseTabs

  const counts = tabCounts(proj)
  const attention = attentionFor(status)
  const { Icon, label: category } = projectCategory(proj.title)
  const showPay = !isEditor && status === 'awaiting_dp'
  const showReview = role === 'client' && status === 'in_review'
  const showSubmit = isEditor && (status === 'in_progress' || status === 'revision')

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
        <ArrowLeft className="w-4 h-4" /> {isEditor ? 'Proyek Saya' : 'Kembali ke Proyek'}
      </button>

      {/* Hero */}
      <div className="card no-hover p-0 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-navy text-white shrink-0">
              <Icon className="w-5.5 h-5.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-navy/40">{category}</span>
                <StatusBadge status={status} />
                {attention && status !== 'completed' && (
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TONE_PILL[attention.tone])}>
                    {attention.label}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy mt-1.5 leading-tight" style={{ fontFamily: "'Inter Display', sans-serif" }}>
                {proj.title}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-navy/55">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {isEditor ? proj.client_name : proj.editor_name}
                </span>
                {proj.project_value > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold text-navy"><CreditCard className="w-3.5 h-3.5" />{formatCurrency(proj.project_value)}</span>
                )}
                {proj.started_at && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Mulai {proj.started_at}</span>
                )}
                {offer?.status === 'accepted' && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Tenggat {formatDate(offer.deadline)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Signature: lifecycle rail */}
          <div className="mt-6 max-w-xl">
            <StageRail status={status} />
          </div>

          {/* Primary actions — shortcuts into the tab where the work happens */}
          {(showPay || showReview || showSubmit) && (
            <div className="flex gap-2 mt-6 flex-wrap">
              {showPay && (
                <button className="btn-primary text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Bayar DP
                </button>
              )}
              {showReview && (
                <button onClick={() => setTab('hasil')} className="btn-primary text-sm">
                  <Eye className="w-4 h-4" /> Tinjau Hasil Kerja
                </button>
              )}
              {showSubmit && (
                <button onClick={() => setTab('hasil')} className="btn-primary text-sm">
                  <Upload className="w-4 h-4" /> Kirim untuk ditinjau
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
                tab === t.key ? 'border-navy text-navy hover:bg-navy-50/40' : 'border-transparent text-navy/45 hover:text-navy hover:bg-navy-50/40'
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
      <div className="card no-hover">
        {tab === 'ringkasan' && <OverviewPanel project={proj} envelope={envelope} />}
        {tab === 'kontrak' && (
          <ContractPanel
            project={proj}
            role={role}
            envelope={envelope}
            agreedAt={envelopeAgreedAt}
            onEnvelopeChange={setEnvelope}
            onAgree={() => setEnvelopeAgreedAt(new Date().toISOString())}
          />
        )}
        {tab === 'hasil' && (
          <DeliverablesPanel
            project={proj}
            role={role}
            versions={deliverables}
            onUpload={handleUpload}
            onApprove={handleApprove}
            onRequestRevision={handleRevisionRequest}
            onDiscuss={() => setTab('chat')}
            onDispute={() => setTab('sengketa')}
          />
        )}
        {tab === 'chat' && (
          <ChatPanel
            project={proj}
            role={role}
            offer={offer}
            onSendOffer={setOffer}
            onOfferResponse={handleOfferResponse}
          />
        )}
        {tab === 'pembayaran' && <PaymentPanel project={proj} />}
        {tab === 'sengketa' && (
          <DisputePanel
            project={proj}
            role={role}
            disputes={disputes}
            onCreate={handleDisputeCreate}
          />
        )}
        {tab === 'penilaian' && status === 'completed' && (
          <RatingPanel
            project={proj}
            role={role}
            review={review}
            onSubmit={(rating, comment) => setReview({
              review_id: `rev-${Date.now()}`,
              project_id: proj.project_id,
              rating,
              comment,
              reviewer_name: proj.client_name,
              created_at: new Date().toISOString(),
            })}
          />
        )}
      </div>
    </div>
  )
}
