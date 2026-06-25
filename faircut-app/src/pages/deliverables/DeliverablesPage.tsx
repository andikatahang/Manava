import { useState } from 'react'
import { Upload, Eye, CheckCircle, XCircle, Clock, Bot, FileImage, Film, Layers } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDateTime } from '../../lib/utils'
import { mockProjects } from '../../data/mockData'

interface DeliverableVersion {
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

const mockVersions: Record<string, DeliverableVersion[]> = {
  p1: [
    { version: 3, uploaded_at: '2026-06-24T10:30:00Z', uploaded_by: 'Budi Santoso', file_name: 'wedding_hero_v3.psd', file_size: '142 MB', status: 'pending_review', ai_diff_score: 12, ai_change_type: 'minor', ai_confidence: 94, change_summary: 'Color temperature adjusted +200K, minor skin retouching on subject 2' },
    { version: 2, uploaded_at: '2026-06-22T14:15:00Z', uploaded_by: 'Budi Santoso', file_name: 'wedding_hero_v2.psd', file_size: '139 MB', status: 'revision_requested', ai_diff_score: 67, ai_change_type: 'major', ai_confidence: 89, change_summary: 'Background replacement detected — scope change vs. original brief' },
    { version: 1, uploaded_at: '2026-06-18T09:00:00Z', uploaded_by: 'Budi Santoso', file_name: 'wedding_hero_v1.psd', file_size: '136 MB', status: 'approved', ai_diff_score: 0, ai_change_type: 'new', ai_confidence: 100, change_summary: 'Initial delivery' },
  ],
  p2: [
    { version: 2, uploaded_at: '2026-06-20T16:00:00Z', uploaded_by: 'Sari Dewi', file_name: 'product_catalog_v2.psd', file_size: '88 MB', status: 'approved', ai_diff_score: 8, ai_change_type: 'minor', ai_confidence: 97, change_summary: 'Shadow adjustments, slight exposure correction on 3 SKUs' },
    { version: 1, uploaded_at: '2026-06-15T11:30:00Z', uploaded_by: 'Sari Dewi', file_name: 'product_catalog_v1.psd', file_size: '85 MB', status: 'revision_requested', ai_diff_score: 0, ai_change_type: 'new', ai_confidence: 100, change_summary: 'Initial delivery' },
  ],
}

const fileIcon = (name: string) => {
  if (name.match(/\.(mp4|mov|avi)$/i)) return <Film className="w-5 h-5 text-purple-500" />
  if (name.match(/\.(psd|png|jpg|jpeg|tiff)$/i)) return <FileImage className="w-5 h-5 text-blue-500" />
  return <Layers className="w-5 h-5 text-navy/40" />
}

const diffColor = (score: number) => {
  if (score <= 15) return 'text-emerald-600 bg-emerald-50'
  if (score <= 40) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export default function DeliverablesPage() {
  const [activeProject, setActiveProject] = useState(mockProjects[0].project_id)
  const activeVersions = mockVersions[activeProject] ?? mockVersions['p1']
  const project = mockProjects.find(p => p.project_id === activeProject)!

  return (
    <div className="space-y-6">
      {/* Project selector */}
      <div className="flex gap-2 flex-wrap">
        {mockProjects.filter(p => !['draft', 'cancelled'].includes(p.status)).map(p => (
          <button key={p.project_id} onClick={() => setActiveProject(p.project_id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeProject === p.project_id
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-border hover:border-navy/40'
            }`}>
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy">Version History</h2>
            <button className="btn-primary text-sm py-2">
              <Upload className="w-4 h-4" /> Upload New Version
            </button>
          </div>

          {activeVersions.map((v, i) => (
            <div key={v.version}
              className={`card ${i === 0 ? 'ring-2 ring-navy/10' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{fileIcon(v.file_name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-navy">v{v.version}</span>
                    <span className="text-sm text-navy/50 truncate">{v.file_name}</span>
                    <span className="text-xs text-navy/40">{v.file_size}</span>
                    {i === 0 && <span className="text-xs bg-navy text-white px-2 py-0.5 rounded-full">Latest</span>}
                  </div>
                  <p className="text-xs text-navy/50 mt-1">
                    Uploaded by {v.uploaded_by} · {formatDateTime(v.uploaded_at)}
                  </p>

                  {/* AI diff analysis */}
                  {v.ai_change_type !== 'new' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-700">AI Change Detection</span>
                        <span className="text-xs text-navy/40">· {v.ai_confidence}% confidence</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${diffColor(v.ai_diff_score)}`}>
                          {v.ai_diff_score}% delta
                        </span>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${v.ai_change_type === 'minor' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {v.ai_change_type} change
                        </span>
                      </div>
                      <p className="text-xs text-navy/60 mt-2">{v.change_summary}</p>
                    </div>
                  )}
                  {v.ai_change_type === 'new' && (
                    <p className="text-xs text-navy/40 mt-2 italic">Initial delivery — no diff available</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <StatusBadge status={v.status} />
                  <button className="btn-ghost text-xs py-1.5 px-3">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
              </div>

              {/* Action buttons for pending review */}
              {v.status === 'pending_review' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button className="flex-1 justify-center btn-primary py-2 text-sm">
                    <CheckCircle className="w-4 h-4" /> Approve Delivery
                  </button>
                  <button className="flex-1 justify-center btn-secondary py-2 text-sm text-amber-600 border-amber-200">
                    <Clock className="w-4 h-4" /> Request Revision
                  </button>
                  <button className="flex-1 justify-center btn-secondary py-2 text-sm text-red-600 border-red-200">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Project integrity summary */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-navy mb-4">Integrity Summary</h3>
            <div className="space-y-3">
              {[
                ['Project', project.title],
                ['Client', project.client_name],
                ['Editor', project.editor_name],
                ['Total Versions', String(activeVersions.length)],
                ['Approved', String(activeVersions.filter(v => v.status === 'approved').length)],
                ['Pending Review', String(activeVersions.filter(v => v.status === 'pending_review').length)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-navy/50">{l}</span>
                  <span className="font-medium text-navy">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-navy mb-3">AI Classifier Legend</h3>
            <div className="space-y-2 text-sm">
              {[
                ['bg-emerald-50 text-emerald-700', '0–15% delta', 'MINOR — within ALLOWANCE, free'],
                ['bg-amber-50 text-amber-700', '16–40% delta', 'REVIEW — borderline, flagged'],
                ['bg-red-50 text-red-700', '41%+ delta', 'MAJOR — paid revision required'],
              ].map(([cls, range, label]) => (
                <div key={range} className="flex items-start gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${cls}`}>{range}</span>
                  <span className="text-xs text-navy/60">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-navy/40 mt-3">Target accuracy ≥ 85%. Low-confidence results escalate to mediator review.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
