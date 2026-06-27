import { Camera, Film, Briefcase } from 'lucide-react'
import type { ProjectStatus } from '../../types'

// The client-facing project journey. A real, ordered sequence — so numbered/
// staged markers are meaningful here, not decorative.
export const STAGES = ['Brief', 'DP', 'Pengerjaan', 'Tinjau', 'Selesai'] as const

// How many stages are fully behind us for a given status.
const COMPLETED_BY_STATUS: Record<ProjectStatus, number> = {
  draft: 0,
  awaiting_dp: 1,
  in_progress: 2,
  revision: 2,
  disputed: 2,
  in_review: 3,
  completed: 5,
  cancelled: 0,
}

export function completedStages(status: ProjectStatus): number {
  return COMPLETED_BY_STATUS[status] ?? 0
}

export function progressPercent(status: ProjectStatus): number {
  const pct: Record<ProjectStatus, number> = {
    draft: 0, awaiting_dp: 12, in_progress: 45, revision: 55,
    disputed: 60, in_review: 82, completed: 100, cancelled: 0,
  }
  return pct[status] ?? 0
}

export function progressColor(status: ProjectStatus): string {
  if (status === 'completed') return '#16a34a'
  if (status === 'disputed') return '#dc2626'
  if (status === 'revision' || status === 'awaiting_dp') return '#d97706'
  return '#2563eb'
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draf',
  awaiting_dp: 'Menunggu DP',
  in_progress: 'Berjalan',
  in_review: 'Ditinjau',
  revision: 'Revisi',
  disputed: 'Disengketakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export type AttentionTone = 'amber' | 'navy' | 'red' | 'emerald'

export interface Attention {
  label: string
  tone: AttentionTone
}

// The one thing the client should do next, surfaced from the consolidated
// sub-areas (payment, review, revision, dispute).
export function attentionFor(status: ProjectStatus): Attention | null {
  switch (status) {
    case 'awaiting_dp':
      return { label: 'Menunggu pembayaran DP', tone: 'amber' }
    case 'in_review':
      return { label: 'Hasil siap ditinjau', tone: 'navy' }
    case 'revision':
      return { label: 'Revisi berlangsung', tone: 'amber' }
    case 'disputed':
      return { label: 'Sengketa aktif', tone: 'red' }
    case 'completed':
      return { label: 'Selesai', tone: 'emerald' }
    default:
      return null
  }
}

export function projectCategory(title: string): { Icon: typeof Camera; label: string } {
  const t = title.toLowerCase()
  if (t.includes('video') || t.includes('film')) return { Icon: Film, label: 'Video' }
  if (t.includes('photo') || t.includes('portrait') || t.includes('retouch') || t.includes('headshot')) {
    return { Icon: Camera, label: 'Foto' }
  }
  return { Icon: Briefcase, label: 'Proyek' }
}
