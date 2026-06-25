import { useState, useRef } from 'react'
import { Plus, ExternalLink, ChevronRight, GripVertical } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDate } from '../../lib/utils'
import { mockApplicants, mockJobPostings } from '../../data/mockData'
import type { Applicant } from '../../types'

const STAGES = ['applied','screening','interview','offered','offer_accepted','confirmed'] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied', screening: 'Screening', interview: 'Interview',
  offered: 'Offered', offer_accepted: 'Offer Accepted', confirmed: 'Confirmed',
}

const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-slate-400',
  screening: 'bg-blue-400',
  interview: 'bg-amber-400',
  offered: 'bg-purple-400',
  offer_accepted: 'bg-emerald-500',
  confirmed: 'bg-navy',
}

export default function RecruitmentPage() {
  const [tab, setTab] = useState<'pipeline'|'postings'|'dss'>('pipeline')
  const [selectedJob, setSelectedJob] = useState(mockJobPostings[0].job_id)
  const [dssModal, setDssModal] = useState<Applicant | null>(null)
  const [liveApplicants, setLiveApplicants] = useState<Applicant[]>(mockApplicants)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const draggedId = useRef<string | null>(null)

  const applicantsForJob = liveApplicants.filter(
    a => a.job_id === selectedJob && !['rejected','offer_expired'].includes(a.tahap)
  )

  function handleDragStart(e: React.DragEvent, applicantId: string) {
    draggedId.current = applicantId
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, stage: Stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  function handleDrop(e: React.DragEvent, targetStage: Stage) {
    e.preventDefault()
    setDragOverStage(null)
    const id = draggedId.current
    if (!id) return
    draggedId.current = null
    setLiveApplicants(prev =>
      prev.map(a => a.applicant_id === id ? { ...a, tahap: targetStage } : a)
    )
  }

  function handleDragEnd() {
    draggedId.current = null
    setDragOverStage(null)
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
        {[['pipeline','ATS Pipeline'], ['postings','Job Postings'], ['dss','DSS Scoring']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-navy text-white shadow-sm' : 'text-navy/60 hover:text-navy'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Pipeline tab */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {mockJobPostings.filter(j => j.status === 'open').map(j => (
                <button key={j.job_id} onClick={() => setSelectedJob(j.job_id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selectedJob === j.job_id ? 'bg-navy text-white border-navy' : 'bg-white text-navy/70 border-border hover:border-navy/30'}`}>
                  {j.title} <span className="ml-1 opacity-60">({j.applicant_count})</span>
                </button>
              ))}
            </div>
            <button className="btn-primary"><Plus className="w-4 h-4" /> Post Job</button>
          </div>

          <p className="text-xs text-navy/40 flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Drag cards between columns to move candidates through the pipeline
          </p>

          {/* Kanban */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4" style={{ minWidth: '960px' }}>
              {STAGES.map(stage => {
                const cards = applicantsForJob.filter(a => a.tahap === stage)
                const isOver = dragOverStage === stage
                return (
                  <div
                    key={stage}
                    className={`flex-1 min-w-[160px] rounded-xl transition-colors duration-150 ${isOver ? 'bg-navy-50 ring-2 ring-navy/30' : ''}`}
                    onDragOver={e => handleDragOver(e, stage)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, stage)}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage]}`} />
                        <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">{STAGE_LABELS[stage]}</h3>
                      </div>
                      <span className="text-xs bg-navy-50 text-navy font-medium px-2 py-0.5 rounded-full">{cards.length}</span>
                    </div>

                    <div className="space-y-3 min-h-[80px]">
                      {cards.map(a => (
                        <div
                          key={a.applicant_id}
                          draggable
                          onDragStart={e => handleDragStart(e, a.applicant_id)}
                          onDragEnd={handleDragEnd}
                          className="card-sm cursor-grab active:cursor-grabbing hover:shadow-card-md hover:border-navy/20 transition-all active:opacity-50 select-none group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3 h-3 text-navy/20 group-hover:text-navy/40 transition-colors flex-shrink-0" />
                              <div className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {a.name.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                              </div>
                            </div>
                            {a.score && <span className="text-xs font-semibold text-navy bg-navy-50 px-2 py-0.5 rounded-full">{a.score}</span>}
                          </div>
                          <p className="text-sm font-medium text-navy leading-tight">{a.name}</p>
                          <p className="text-xs text-navy/50 truncate mt-0.5">{a.email}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-navy/40">{formatDate(a.created_at)}</span>
                            <div className="flex gap-1">
                              <a href={a.portfolio_url} target="_blank" rel="noreferrer"
                                className="p-1 rounded hover:bg-navy-50 text-navy/40 hover:text-navy transition-colors">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              {stage === 'offer_accepted' && (
                                <button onClick={() => setDssModal(a)}
                                  className="p-1 rounded hover:bg-navy-50 text-navy/40 hover:text-navy transition-colors">
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {cards.length === 0 && (
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${isOver ? 'border-navy/40 bg-navy-50' : 'border-border'}`}>
                          <p className="text-xs text-navy/30">{isOver ? 'Drop here' : 'Empty'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Job postings tab */}
      {tab === 'postings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary"><Plus className="w-4 h-4" /> New Job Posting</button>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="table">
              <thead><tr><th>Title</th><th>Specialization</th><th>Applicants</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {mockJobPostings.map(j => (
                  <tr key={j.job_id}>
                    <td className="font-medium text-navy">{j.title}</td>
                    <td><div className="flex flex-wrap gap-1">{j.specialization.map(s => <span key={s} className="badge-navy text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy">{s.replace('_',' ')}</span>)}</div></td>
                    <td><span className="font-medium">{j.applicant_count}</span></td>
                    <td><StatusBadge status={j.status} /></td>
                    <td className="text-navy/60">{formatDate(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DSS tab */}
      {tab === 'dss' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-navy mb-1">DSS Scoring Formula</h3>
            <p className="text-sm text-navy/50 mb-4">Deterministic department recommendation engine</p>
            <div className="space-y-3">
              {[
                { label: 'Skill Match', weight: '40%', desc: 'Specialization overlap with department targets', color: 'bg-navy' },
                { label: 'Capacity', weight: '25%', desc: 'Current vs target editor count in department', color: 'bg-blue-400' },
                { label: 'Workload', weight: '20%', desc: 'Avg active projects per editor in department', color: 'bg-emerald-400' },
                { label: 'Growth', weight: '15%', desc: 'Recent hires in last 3 months', color: 'bg-amber-400' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 p-3 bg-primary-200 rounded-xl">
                  <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">{item.weight}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{item.label}</p>
                    <p className="text-xs text-navy/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-navy mb-4">Department Rankings (Example)</h3>
            <div className="space-y-3">
              {[
                { dept: 'Photo Retouching', score: 92, skill: 100, capacity: 75, workload: 100, growth: 100 },
                { dept: 'Video Editing', score: 87, skill: 100, capacity: 100, workload: 50, growth: 100 },
                { dept: 'Color Grading', score: 79, skill: 75, capacity: 75, workload: 100, growth: 50 },
              ].map((d, i) => (
                <div key={d.dept} className={`p-4 rounded-xl border ${i === 0 ? 'border-navy bg-navy-50' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-navy text-white' : 'bg-border text-navy/60'}`}>{i+1}</span>
                      <span className="text-sm font-semibold text-navy">{d.dept}</span>
                    </div>
                    <span className="text-lg font-bold text-navy">{d.score}</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                    <div className="bg-navy h-1.5 rounded-full" style={{ width: `${d.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DSS modal */}
      <Modal open={!!dssModal} onClose={() => setDssModal(null)} title="DSS Department Assignment" size="md">
        {dssModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-primary-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-navy text-white font-bold flex items-center justify-center">
                {dssModal.name.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
              </div>
              <div>
                <p className="font-semibold text-navy">{dssModal.name}</p>
                <p className="text-sm text-navy/50">Score: {dssModal.score ?? 'N/A'}</p>
              </div>
            </div>
            <p className="text-sm text-navy/60">AI-recommended department assignment:</p>
            <div className="space-y-2">
              {[{ dept: 'Photo Retouching', score: 92 }, { dept: 'Video Editing', score: 85 }, { dept: 'Color Grading', score: 78 }].map((d, i) => (
                <div key={d.dept} className={`flex items-center justify-between p-3 rounded-xl border ${i===0?'border-navy bg-navy-50':'border-border'}`}>
                  <span className="text-sm font-medium text-navy">{d.dept}</span>
                  <span className="font-bold text-navy">{d.score}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1" onClick={() => setDssModal(null)}>Assign to Photo Retouching</button>
              <button className="btn-secondary flex-1" onClick={() => setDssModal(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
