import { useState } from 'react'
import { Search, Shield, Filter } from 'lucide-react'
import { formatDateTime } from '../../lib/utils'

type EntityType = 'project' | 'revision' | 'payment' | 'contract' | 'user' | 'dispute' | 'all'
type ActionType = 'created' | 'updated' | 'approved' | 'rejected' | 'released' | 'classified' | 'logged_in' | 'all'

interface AuditEvent {
  id: string
  timestamp: string
  actor_name: string
  actor_role: string
  action: string
  entity_type: Exclude<EntityType, 'all'>
  entity_id: string
  entity_label: string
  detail: string
  ip: string
  immutable: boolean
}

const mockAuditEvents: AuditEvent[] = [
  { id: 'a01', timestamp: '2026-06-24T10:31:05Z', actor_name: 'System', actor_role: 'system', action: 'classified', entity_type: 'revision', entity_id: 'r3', entity_label: 'Revision #3 – Wedding Package Hero', detail: 'AI classifier: MINOR (94% confidence) · delta 12%', ip: '—', immutable: true },
  { id: 'a02', timestamp: '2026-06-24T09:15:22Z', actor_name: 'Andika Rahman', actor_role: 'admin_manager', action: 'approved', entity_type: 'contract', entity_id: 'c2', entity_label: 'Contract #C-2026-002', detail: 'Contract approved; DP escrow tranche triggered', ip: '192.168.1.12', immutable: true },
  { id: 'a03', timestamp: '2026-06-23T16:44:10Z', actor_name: 'Citra Lestari', actor_role: 'finance', action: 'released', entity_type: 'payment', entity_id: 'tx7', entity_label: 'Escrow ESC-003 final release', detail: 'IDR 12,500,000 released to company — SLA 00:32m', ip: '10.0.0.5', immutable: true },
  { id: 'a04', timestamp: '2026-06-23T14:20:00Z', actor_name: 'Budi Santoso', actor_role: 'editor', action: 'updated', entity_type: 'project', entity_id: 'p1', entity_label: 'Wedding Package – Hartono Family', detail: 'Deliverable v3 uploaded (142 MB)', ip: '203.0.113.5', immutable: true },
  { id: 'a05', timestamp: '2026-06-23T11:05:33Z', actor_name: 'Reza Mediator', actor_role: 'mediator', action: 'approved', entity_type: 'dispute', entity_id: 'd1', entity_label: 'Dispute DIS-2026-001', detail: 'Resolved: partial refund 30% approved. Note: AI evidence accepted', ip: '10.0.0.8', immutable: true },
  { id: 'a06', timestamp: '2026-06-22T08:30:15Z', actor_name: 'PT Maju Jaya', actor_role: 'client', action: 'created', entity_type: 'revision', entity_id: 'r2', entity_label: 'Revision request – Product Catalog', detail: 'Client requested background swap — flagged as MAJOR by AI (89%)', ip: '180.244.1.1', immutable: true },
  { id: 'a07', timestamp: '2026-06-21T17:00:00Z', actor_name: 'System', actor_role: 'system', action: 'released', entity_type: 'payment', entity_id: 'tx5', entity_label: 'Escrow ESC-002 auto-release', detail: 'Final 50% auto-released — delivery accepted, SLA 00:18m', ip: '—', immutable: true },
  { id: 'a08', timestamp: '2026-06-20T13:22:44Z', actor_name: 'Andika Rahman', actor_role: 'admin_manager', action: 'created', entity_type: 'user', entity_id: 'u6', entity_label: 'New editor: Sari Dewi', detail: 'Onboarding completed; DSS score 82/100; assigned Product dept.', ip: '192.168.1.12', immutable: true },
  { id: 'a09', timestamp: '2026-06-19T09:10:00Z', actor_name: 'Budi Santoso', actor_role: 'editor', action: 'logged_in', entity_type: 'user', entity_id: 'u2', entity_label: 'Session start', detail: 'Login from new device — browser: Chrome 126 macOS', ip: '203.0.113.5', immutable: true },
  { id: 'a10', timestamp: '2026-06-18T15:30:00Z', actor_name: 'PT Maju Jaya', actor_role: 'client', action: 'approved', entity_type: 'contract', entity_id: 'c1', entity_label: 'Contract #C-2026-001', detail: 'Brief digitally signed; DP IDR 10,000,000 escrowed', ip: '180.244.1.1', immutable: true },
]

const entityColors: Record<string, string> = {
  project: 'bg-blue-50 text-blue-700',
  revision: 'bg-amber-50 text-amber-700',
  payment: 'bg-emerald-50 text-emerald-700',
  contract: 'bg-navy-50 text-navy',
  user: 'bg-purple-50 text-purple-700',
  dispute: 'bg-red-50 text-red-700',
}

const actionColors: Record<string, string> = {
  created: 'text-emerald-600',
  updated: 'text-blue-600',
  approved: 'text-emerald-600',
  rejected: 'text-red-600',
  released: 'text-emerald-600',
  classified: 'text-purple-600',
  logged_in: 'text-navy/60',
}

const roleColors: Record<string, string> = {
  system: 'bg-gray-100 text-gray-600',
  admin_manager: 'bg-navy-50 text-navy',
  editor: 'bg-blue-50 text-blue-700',
  client: 'bg-amber-50 text-amber-700',
  mediator: 'bg-purple-50 text-purple-700',
  finance: 'bg-emerald-50 text-emerald-700',
}

export default function AuditTrailPage() {
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<EntityType>('all')
  const [actionFilter, setActionFilter] = useState<ActionType>('all')

  const filtered = mockAuditEvents.filter(e => {
    const matchSearch = search === '' ||
      e.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      e.entity_label.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase())
    const matchEntity = entityFilter === 'all' || e.entity_type === entityFilter
    const matchAction = actionFilter === 'all' || e.action === actionFilter
    return matchSearch && matchEntity && matchAction
  })

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Total Events', String(mockAuditEvents.length), 'text-navy'],
          ['Immutable Records', String(mockAuditEvents.filter(e => e.immutable).length), 'text-emerald-600'],
          ['System Actions', String(mockAuditEvents.filter(e => e.actor_role === 'system').length), 'text-purple-600'],
          ['Today', String(mockAuditEvents.filter(e => e.timestamp.startsWith('2026-06-24')).length), 'text-blue-600'],
        ].map(([l, v, cls]) => (
          <div key={l} className="card-sm text-center">
            <p className={`text-2xl font-bold ${cls}`}>{v}</p>
            <p className="text-xs text-navy/50 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search actor, entity, or detail…" className="input pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-navy/40" />
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value as EntityType)} className="input py-2 w-auto">
            {(['all','project','revision','payment','contract','user','dispute'] as EntityType[]).map(v => (
              <option key={v} value={v}>{v === 'all' ? 'All entities' : v}</option>
            ))}
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value as ActionType)} className="input py-2 w-auto">
            {(['all','created','updated','approved','rejected','released','classified','logged_in'] as ActionType[]).map(v => (
              <option key={v} value={v}>{v === 'all' ? 'All actions' : v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Event log table */}
      <div className="table-wrapper">
        <table className="table w-full text-sm">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
              <th>IP</th>
              <th className="text-center">Integrity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs text-navy/50">{formatDateTime(e.timestamp)}</td>
                <td>
                  <div>
                    <p className="font-medium text-navy text-xs">{e.actor_name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[e.actor_role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {e.actor_role.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`font-semibold text-xs uppercase tracking-wide ${actionColors[e.action] ?? 'text-navy/60'}`}>
                    {e.action}
                  </span>
                </td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entityColors[e.entity_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.entity_type}
                  </span>
                  <p className="text-xs text-navy/60 mt-0.5">{e.entity_label}</p>
                </td>
                <td className="max-w-xs">
                  <p className="text-xs text-navy/70 leading-relaxed">{e.detail}</p>
                </td>
                <td className="text-xs text-navy/40 font-mono">{e.ip}</td>
                <td className="text-center">
                  {e.immutable
                    ? <Shield className="w-4 h-4 text-emerald-500 mx-auto" aria-label="Immutable record" />
                    : <Shield className="w-4 h-4 text-gray-300 mx-auto" />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-navy/40">No events match your filters.</div>
        )}
      </div>

      <p className="text-xs text-navy/40">
        All audit events are immutable and append-only. Records are retained for 7 years per IFRS 15 compliance requirements.
      </p>
    </div>
  )
}
